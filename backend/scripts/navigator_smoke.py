"""Actual-package Navigator feature checks, using smoke.py's owned HTTP server."""


def verify_navigator(client, dataset_id):
    root = '/v1/navigator'
    def post(path, payload, expected=200):
        response = client.post(root + path, json=payload)
        assert response.status_code == expected, (path, response.status_code, response.text[:1000])
        return response.json()
    def get(path):
        response = client.get(root + path)
        assert response.is_success, (path, response.status_code, response.text[:1000])
        return response.json()
    def run(path, payload):
        return post(path, {'dataset_id': dataset_id} | payload, 201)

    catalog = get(f'/datasets/{dataset_id}/catalog')
    assert len(catalog['screens']) == 7 and len(catalog['transition_scenarios']) == 7
    post('/prepare', {'dataset_id': dataset_id})
    inventory = post('/inventory', {'dataset_id': dataset_id, 'year': 2024})
    assert inventory['selected']['total_tco2e'] == 244724
    assert inventory['suppliers']['total'] == 86
    draft = post('/inventory', {'dataset_id': dataset_id, 'year': 2025})
    assert draft['selected']['status'] == 'blocked' and draft['quality_findings']
    assert draft['selected']['scope_sum_tco2e'] == 72784173
    scenario = post('/context', {'dataset_id': dataset_id, 'physical_scenario': 'ssp126', 'year': 2040})
    assert scenario['values']['carbon_price_eur_t'] == 380
    freight_catalog = get(f'/datasets/{dataset_id}/freight/catalog')
    assert len(freight_catalog['modes']) == 7 and len(freight_catalog['presets']) == 4
    route = post('/freight/lookup', {'dataset_id': dataset_id, 'origin': 'Riga port', 'destination': 'Kantvik mill'})
    assert route['estimated'] and not route['externally_verified']
    lookup_trip = run('/freight/trips', {'mass_t': 24, 'legs': route['legs']})
    assert lookup_trip['output']['total_kgco2e'] > 0 and not lookup_trip['output']['externally_verified_route']
    trip = run('/freight/trips', {'preset_id': 'lv'})
    assert abs(trip['output']['total_kgco2e'] - 22204.8) < .00001
    batch = run('/freight/batch', {'year': 2025, 'alternative_factor_id': 'EF-TKM-TRUCK-HVO', 'adoption': 1})
    assert batch['output']['included_rows'] == 2339 and 3000 < batch['output']['difference_tco2e'] < 3300
    pathway = run('/pathways/runs', {'physical_scenario': 'ssp126', 'year': 2030, 'selection_mode': 'cheapest'})
    assert len(pathway['output']['macc']) == 30 and len(pathway['output']['series']) == 26
    assert not pathway['output']['target_compliance_validated']
    climate = run('/climate/runs', {'physical_scenario': 'ssp245', 'year': 2040, 'crop_id': 'pea_fi'})
    assert len(climate['output']['grid_cells']) == 84 and len(climate['output']['timeline']) == 108
    assert not climate['output']['trained_or_validated_forecast']
    historical_low = run('/climate/runs', {'physical_scenario': 'ssp126', 'year': 2025})
    historical_high = run('/climate/runs', {'physical_scenario': 'ssp585', 'year': 2025})
    assert historical_low['output']['selected'] == historical_high['output']['selected']
    nature = run('/nature/runs', {'year': 2025, 'catch_crop_pct': 20, 'mineral_n_reduction_pct': 10, 'buffer_strips': True})
    assert len(nature['output']['catchments']) == 42 and len(nature['output']['top_catchments']) == 8
    assert nature['output']['totals']['p_kg_estimate'] < nature['output']['totals']['baseline_p_kg_estimate']
    assert not nature['output']['company_attribution_validated']
    overview = run('/overview/runs', {'physical_scenario': 'ssp245', 'year': 2040, 'nature_year': 2025})
    assert overview['output']['source_years'] == {'inventory': 2024, 'pathway_assumed_base': 2025, 'climate': 2040, 'nature_contract_parcels': 2025}
    queue = get(f'/datasets/{dataset_id}/reviews?status=blocked')
    blocked = queue['items'][0]
    action = {'expected_version': blocked['version'], 'reviewer': 'HTTP smoke reviewer', 'outcome': 'approve', 'notes': 'Testing that unresolved numerical blockers cannot be overridden.'}
    refused = client.post(root + f"/datasets/{dataset_id}/reviews/{blocked['id']}/actions", json=action)
    assert refused.status_code == 409
    action.update(expected_version=1, notes='HTTP smoke test of prototype workflow only; not operational approval.')
    review_path = f"/datasets/{dataset_id}/reviews/{trip['review_item_id']}"
    reviewed = post(review_path + '/actions', action)
    assert reviewed['status'] == 'approved_for_demo'
    exported = get(review_path + '/export')
    assert exported['run']['id'] == trip['id'] and exported['audit']['total'] == 2
    assert get(f'/datasets/{dataset_id}/search?q=F0001')['records']
    traced = get(f'/datasets/{dataset_id}/records/farm_registry/F0001')
    assert traced['records'][0]['source']['dataset_id'] == dataset_id
    thread = run('/conversations', {'title': 'Navigator HTTP smoke evidence check'})
    reply = post(f"/conversations/{thread['id']}/messages", {'expected_version': 1, 'question': 'How are freight emissions calculated from evidence?', 'run_id': batch['id']}, 201)
    assert reply['messages'][-1]['generation_mode'] == 'extractive_not_ai'
    assert reply['messages'][-1]['citations']
    return {'screens': catalog['screens'], 'transition_scenarios': len(catalog['transition_scenarios']), 'catalogue_actions': len(pathway['output']['macc']), 'published_inventory_2024_tco2e': inventory['selected']['total_tco2e'], 'draft_2025': draft['selected']['status'], 'quality_findings': len(draft['quality_findings']), 'route_lookup': 'explicit_great_circle_estimate', 'preset_trip_kgco2e': trip['output']['total_kgco2e'], 'hvo_sensitivity_tco2e': batch['output']['difference_tco2e'], 'greedy_target_reached': pathway['output']['selection']['minimum_reached'], 'climate_grid_cells': len(climate['output']['grid_cells']), 'climate_timeline_points': len(climate['output']['timeline']), 'historical_scenarios_identical': True, 'nature_contract_area_ha': nature['output']['contract_area_ha'], 'nature_catchments': len(nature['output']['catchments']), 'source_years': overview['output']['source_years'], 'blocked_approval_rejected': True, 'trip_review_version': reviewed['version'], 'conversation_messages': reply['message_count'], 'assistant_generation_mode': reply['messages'][-1]['generation_mode']}


if __name__ == '__main__':
    from smoke import main
    main()
