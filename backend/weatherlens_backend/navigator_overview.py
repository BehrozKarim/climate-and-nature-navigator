from .navigator_climate import ClimateRiskService
from .navigator_context import NavigatorContext
from .navigator_nature import NatureSensitivityService
from .navigator_pathways import PathwayService
from .navigator_workflows import ReviewService


def overview(store, dataset_id, physical_scenario='ssp245', year=2040, transition_scenario=None, nature_year=2025):
    context = NavigatorContext(store, dataset_id)
    scenario = context.scenario(physical_scenario, year, transition_scenario)
    inventory = context.inventory()
    latest = max(inventory['history'], key=lambda r: r['year']) if inventory['history'] else None
    pathway = PathwayService(store, dataset_id).calculate(physical_scenario, year, transition_scenario=transition_scenario)
    climate = ClimateRiskService(store, dataset_id).calculate(physical_scenario, year)
    nature = NatureSensitivityService(store, dataset_id).calculate(nature_year)
    quality = ReviewService(store, dataset_id).findings()
    queue = ReviewService(store, dataset_id).list(limit=8)
    nature_source_year = nature_year if nature['contract_area_ha'] is not None else None
    catchment_source_available = any(t['table'] == 'catchments' for t in context.manifest['tables'])
    return {
        'dataset_id': dataset_id, 'method_version': 'navigator-overview-composition-v1',
        'status': 'composed_context_requires_review', 'year': year, 'context': scenario,
        'inventory': latest,
        'scope3_share_pct': latest['scopes']['scope3'] / latest['total_tco2e'] * 100 if latest and latest['total_tco2e'] else None,
        'pathway': {k: pathway.get(k) for k in ('status', 'method_version', 'baseline', 'selection', 'selected_year', 'series', 'costs', 'model', 'limitations')},
        'climate': {k: climate[k] for k in ('year', 'status', 'method_version', 'selected', 'sourcing_hedge', 'coverage', 'sources', 'model', 'limitations')},
        'nature': {'requested_year': nature_year, 'source_year': nature_source_year, 'method_version': nature['method_version'], 'status': nature['status'],
                   'catchment_count': len(nature['catchments']) if catchment_source_available else None,
                   'poor_or_bad_catchments': sum(r['ecological_status'] in ('poor', 'bad') for r in nature['catchments']) if catchment_source_available else None,
                   'contract_area_ha': nature['contract_area_ha'], 'model': nature['model'], 'sources': nature['sources']},
        'attention': {'unresolved_findings': sum(f['resolution'] == 'open' for f in quality), 'numerical_blockers': sum(f['blocking'] for f in quality), 'review_items': queue},
        'source_years': {'inventory': latest['year'] if latest else None, 'pathway_assumed_base': pathway.get('baseline', {}).get('assumed_base_year'), 'climate': year, 'nature_contract_parcels': nature_source_year},
        'limitations': ['Each card exposes its own source year; the global horizon does not redate historic data.', 'Published inventory, illustrative target/crop/nutrient models and local review state are distinct forms of evidence.', 'No complete inventory, validated forecast or production approval is implied.']
    }
