from fastapi.testclient import TestClient
from tests.navigator_fixture import NavigatorCase
from weatherlens_backend.app import create_app
from weatherlens_backend.config import Settings


class NavigatorApiTests(NavigatorCase):
    def setUp(self):
        super().setUp()
        settings = Settings(database=self.store.path, dataset_root=self.root, document_root=self.root / 'docs', api_token='navigator-token', llm_base_url='', llm_api_key='', llm_model='')
        self.client = TestClient(create_app(settings))
        self.client.__enter__()
        self.addCleanup(self.client.__exit__, None, None, None)
        self.headers = {'Authorization': 'Bearer navigator-token'}

    def post(self, path, body):
        return self.client.post('/v1/navigator' + path, headers=self.headers, json=body)

    def get(self, path):
        return self.client.get('/v1/navigator' + path, headers=self.headers)

    def test_catalog_and_new_routes_share_bearer_protection(self):
        path = f'/v1/navigator/datasets/{self.ds}/catalog'
        self.assertEqual(self.client.get(path).status_code, 401)
        result = self.client.get(path, headers=self.headers)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(len(result.json()['screens']), 7)
        self.assertEqual(self.get('/models/nature').status_code, 200)

    def test_all_screen_calculations_return_persisted_source_bound_results(self):
        self.assertEqual(self.post('/prepare', {'dataset_id': self.ds}).status_code, 200)
        inventory = self.post('/inventory', {'dataset_id': self.ds, 'year': 2025})
        self.assertEqual(inventory.json()['selected']['status'], 'blocked')
        context = self.post('/context', {'dataset_id': self.ds, 'physical_scenario': 'ssp126', 'year': 2035})
        self.assertEqual(context.json()['values']['carbon_price_eur_t'], 270)
        requests = [('/freight/trips', {'mass_t': 10, 'legs': [{'origin': 'A', 'destination': 'B', 'distance_km': 100, 'mode': 'truck'}]}), ('/freight/batch', {'year': 2025}), ('/pathways/runs', {'physical_scenario': 'ssp126', 'year': 2030, 'action_ids': ['L13', 'L14']}), ('/climate/runs', {'physical_scenario': 'ssp245', 'year': 2040, 'crop_id': 'pea_fi'}), ('/nature/runs', {'year': 2025}), ('/overview/runs', {'physical_scenario': 'ssp245', 'year': 2040})]
        for path, body in requests:
            with self.subTest(path=path):
                result = self.post(path, {'dataset_id': self.ds} | body)
                self.assertEqual(result.status_code, 201, result.text)
                run = result.json()
                self.assertEqual(run['dataset_id'], self.ds)
                self.assertEqual(self.client.get('/v1/runs/' + run['id'], headers=self.headers).status_code, 200)
                self.assertEqual(self.get(f"/datasets/{self.ds}/reviews/{run['review_item_id']}").status_code, 200)

    def test_trip_review_export_stale_update_and_blocker_rules(self):
        self.post('/prepare', {'dataset_id': self.ds})
        blocked = self.get(f'/datasets/{self.ds}/reviews?status=blocked').json()['items'][0]
        action = {'expected_version': 1, 'reviewer': 'Demo reviewer', 'outcome': 'approve', 'notes': 'Cannot override numerical blockers'}
        self.assertEqual(self.post(f"/datasets/{self.ds}/reviews/{blocked['id']}/actions", action).status_code, 409)
        run = self.post('/freight/trips', {'dataset_id': self.ds, 'mass_t': 10, 'legs': [{'distance_km': 100, 'mode': 'truck'}]}).json()
        path = f"/datasets/{self.ds}/reviews/{run['review_item_id']}"
        approved = self.post(path + '/actions', action)
        self.assertEqual(approved.json()['status'], 'approved_for_demo')
        self.assertEqual(self.post(path + '/actions', action).status_code, 409)
        exported = self.get(path + '/export').json()
        self.assertEqual(exported['run']['id'], run['id'])
        self.assertEqual(exported['audit']['total'], 2)

    def test_quality_judgment_does_not_unblock_source_and_is_audited(self):
        finding = self.get(f'/datasets/{self.ds}/findings').json()['findings'][0]
        result = self.post(f"/datasets/{self.ds}/findings/{finding['id']}/disposition", {'expected_version': 0, 'outcome': 'dismiss', 'note': 'Need better evidence of the cause'})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertTrue(result.json()['blocking'])
        self.assertEqual(self.post('/inventory', {'dataset_id': self.ds, 'year': 2025}).json()['selected']['status'], 'blocked')
        self.assertTrue(self.get(f'/datasets/{self.ds}/audit').json()['events'])

    def test_search_route_lookup_and_persistent_assistant_thread(self):
        matches = self.get(f'/datasets/{self.ds}/search?q=F1').json()
        self.assertTrue(matches['records'])
        self.assertEqual(self.get(f'/datasets/{self.ds}/records/farm_registry/F1').status_code, 200)
        route = self.post('/freight/lookup', {'dataset_id': self.ds, 'origin': 'Riga', 'destination': 'Kantvik'})
        self.assertTrue(route.json()['estimated'])
        thread = self.post('/conversations', {'dataset_id': self.ds, 'title': 'Freight evidence'}).json()
        reply = self.post(f"/conversations/{thread['id']}/messages", {'expected_version': 1, 'question': 'Freight evidence'})
        self.assertEqual(reply.status_code, 201, reply.text)
        self.assertEqual(reply.json()['messages'][-1]['generation_mode'], 'extractive_not_ai')
        self.assertTrue(reply.json()['messages'][-1]['citations'])
        self.assertEqual(self.get('/conversations/' + thread['id']).json()['message_count'], 2)

    def test_unknown_fields_nonfinite_inputs_and_source_injection_rejected(self):
        for body in [{'mass_t': 10, 'legs': [{'distance_km': 100, 'mode': 'aircraft'}]}, {'mass_t': 'NaN', 'preset_id': 'fi'}, {'mass_t': 10, 'preset_id': 'fi', 'client_total': 7}]:
            self.assertEqual(self.post('/freight/trips', {'dataset_id': self.ds} | body).status_code, 422)
        self.assertEqual(self.post('/climate/runs', {'dataset_id': self.ds, 'year': True}).status_code, 422)
        self.assertEqual(self.post('/freight/lookup', {'dataset_id': self.ds, 'origin': 'unknown', 'destination': 'Riga'}).status_code, 422)

    def test_interactive_previews_do_not_fill_the_run_or_review_queue(self):
        requests = [('/pathways/preview', {'action_ids': ['L20']}), ('/climate/preview', {}), ('/nature/preview', {'year': 2025}), ('/freight/preview', {'preset_id': 'fi'}), ('/overview/preview', {})]
        for path, body in requests:
            response = self.post(path, {'dataset_id': self.ds} | body)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertFalse(response.json()['persisted'])
            self.assertEqual(response.json()['output']['dataset_id'], self.ds)
        with self.store.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM runs').fetchone()[0], 0)
            self.assertEqual(db.execute('SELECT count(*) FROM navigator_reviews').fetchone()[0], 0)

    def test_overview_does_not_label_missing_parcel_plans_as_a_source_year(self):
        result = self.post('/overview/preview', {'dataset_id': self.ds, 'nature_year': 2050}).json()['output']
        self.assertEqual(result['nature']['status'], 'insufficient_data')
        self.assertIsNone(result['source_years']['nature_contract_parcels'])
        self.assertEqual(result['nature']['requested_year'], 2050)

    def test_lookup_legs_can_be_submitted_directly_to_the_trip_calculator(self):
        route = self.post('/freight/lookup', {'dataset_id': self.ds, 'origin': 'Riga', 'destination': 'Kantvik'}).json()
        response = self.post('/freight/trips', {'dataset_id': self.ds, 'mass_t': 10, 'legs': route['legs']})
        self.assertEqual(response.status_code, 201, response.text)
        lines = self.client.get('/v1/runs/' + response.json()['id'] + '/lines', headers=self.headers).json()['items']
        self.assertEqual(lines[0]['distance_basis'], 'great_circle_estimate')
        self.assertEqual(lines[0]['distance_verification'], 'unverified_client_input')
