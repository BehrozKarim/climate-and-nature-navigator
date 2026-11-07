from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


Short = Annotated[str, Field(min_length=1, max_length=160)]
Text = Annotated[str, Field(max_length=8000)]
Year = Annotated[int, Field(ge=1900, le=2100, strict=True)]


class Model(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True, allow_inf_nan=False)


class Empty(Model):
    pass


class DatasetInput(Model):
    dataset_id: Short


class FreightInput(DatasetInput):
    year: Year
    direction: Literal['inbound', 'outbound'] | None = None
    alternative_factor_id: Short | None = None
    adoption: float = Field(default=0, ge=0, le=1)


class CompareInput(DatasetInput):
    action_ids: list[Short] = Field(min_length=1, max_length=6)
    objective: str = Field(min_length=1, max_length=2000)


class ClimateInput(DatasetInput):
    region: Short
    scenario: Literal['ssp126', 'ssp245', 'ssp585']
    baseline_start: Year = 1991
    baseline_end: Year = 2020
    future_start: Year = 2041
    future_end: Year = 2060
    months: list[Annotated[int, Field(ge=1, le=12, strict=True)]] = Field(default_factory=lambda: [5, 6, 7, 8], min_length=1, max_length=12)


class NatureInput(DatasetInput):
    year: Year = 2025
    crop: Short | None = None


class SourceRef(Model):
    table: Short
    row_number: int = Field(ge=2, strict=True)


class Alternative(Model):
    action_id: Short | None = None
    description: str = Field(min_length=1, max_length=2000)
    reason: str = Field(min_length=1, max_length=4000)


class DecisionCreate(DatasetInput):
    decision_type: Literal['investigate', 'pilot', 'investment'] = 'investigate'
    objective: Text = ''
    decision_request: Text = ''
    action_ids: list[Short] = Field(default_factory=list, max_length=6)
    rationale: Text = ''
    owner: str = Field(default='', max_length=160)
    alternatives: list[Alternative] = Field(default_factory=list, max_length=10)
    open_questions: list[Annotated[str, Field(min_length=1, max_length=2000)]] = Field(default_factory=list, max_length=20)
    source_refs: list[SourceRef] = Field(default_factory=list, max_length=30)
    run_ids: list[Short] = Field(default_factory=list, max_length=10)


class DecisionChanges(Model):
    decision_type: Literal['investigate', 'pilot', 'investment'] | None = None
    objective: Text | None = None
    decision_request: Text | None = None
    action_ids: list[Short] | None = Field(default=None, max_length=6)
    rationale: Text | None = None
    owner: str | None = Field(default=None, max_length=160)
    alternatives: list[Alternative] | None = Field(default=None, max_length=10)
    open_questions: list[Annotated[str, Field(min_length=1, max_length=2000)]] | None = Field(default=None, max_length=20)
    source_refs: list[SourceRef] | None = Field(default=None, max_length=30)
    run_ids: list[Short] | None = Field(default=None, max_length=10)

    @model_validator(mode='after')
    def no_null_changes(self):
        if not self.model_fields_set or any(getattr(self, k) is None for k in self.model_fields_set):
            raise ValueError('Provide at least one change; editable fields cannot be null')
        return self


class VersionInput(Model):
    expected_version: int = Field(ge=1, strict=True)


class DecisionPatch(VersionInput):
    changes: DecisionChanges


class SubmitInput(VersionInput):
    evidence_acknowledged: bool = Field(strict=True)


class ReviewInput(VersionInput):
    reviewer: str = Field(min_length=2, max_length=160)
    outcome: Literal['approve', 'request_changes']
    notes: str = Field(min_length=1, max_length=4000)


class SearchInput(DatasetInput):
    query: str = Field(min_length=1, max_length=2000)
    limit: int = Field(default=5, ge=1, le=10)


class AssistantInput(DatasetInput):
    question: str = Field(min_length=1, max_length=2000)
    run_id: Short | None = None


class NavigatorScenario(DatasetInput):
    physical_scenario: Literal['ssp126', 'ssp245', 'ssp585'] = 'ssp245'
    year: int = Field(default=2040, ge=2025, le=2050, strict=True)
    transition_scenario: Short | None = None


class NavigatorOverview(NavigatorScenario):
    nature_year: Year = 2025


class NavigatorInventory(DatasetInput):
    year: Year = 2024
    restated: bool = Field(default=False, strict=True)


class NavigatorPathway(NavigatorScenario):
    action_ids: list[Short] | None = Field(default=None, max_length=30)
    selection_mode: Literal['manual', 'all', 'cheapest'] = 'manual'
    start_years: dict[Short, Year] = Field(default_factory=dict, max_length=30)


class NavigatorClimate(DatasetInput):
    physical_scenario: Literal['ssp126', 'ssp245', 'ssp585'] = 'ssp245'
    year: int = Field(default=2040, ge=2025, le=2060, strict=True)
    crop_id: Literal['pea_fi', 'pea_se', 'rape_fi', 'potato_fi', 'carrot_fi'] = 'pea_fi'
    volume_t: float = Field(default=1000, gt=0, le=10000000, strict=True)


class NavigatorNature(DatasetInput):
    year: Year = 2025
    crop: Short | None = None
    catch_crop_pct: float = Field(default=0, ge=0, le=60, strict=True)
    mineral_n_reduction_pct: float = Field(default=0, ge=0, le=30, strict=True)
    buffer_strips: bool = Field(default=False, strict=True)


class NavigatorRouteLookup(DatasetInput):
    origin: Short
    destination: Short


class NavigatorLeg(Model):
    origin: str = Field(default='', max_length=160)
    destination: str = Field(default='', max_length=160)
    distance_km: float = Field(gt=0, le=100000, strict=True)
    mode: Literal['truck', 'truck-reefer', 'truck-hvo', 'rail', 'ship-bulk', 'ship-reefer', 'ropax']
    distance_basis: Literal['user_entered_unverified', 'great_circle_estimate', 'prototype_preset_estimate'] = 'user_entered_unverified'
    points: list[tuple[Annotated[float, Field(ge=-90, le=90, strict=True)], Annotated[float, Field(ge=-180, le=180, strict=True)]]] = Field(default_factory=list, max_length=100)


class NavigatorTrip(DatasetInput):
    mass_t: float | None = Field(default=None, gt=0, le=1000000, strict=True)
    legs: list[NavigatorLeg] | None = Field(default=None, min_length=1, max_length=10)
    preset_id: Short | None = None
    material: str = Field(default='', max_length=300)

    @model_validator(mode='after')
    def trip_inputs(self):
        if (self.legs is None) == (self.preset_id is None) or (self.legs is not None and self.mass_t is None):
            raise ValueError('Choose a preset or explicit legs with a positive mass')
        return self


class NavigatorDisposition(Model):
    expected_version: int = Field(ge=0, strict=True)
    outcome: Literal['confirm', 'dismiss']
    note: str = Field(min_length=1, max_length=4000)


class NavigatorConversation(DatasetInput):
    title: str = Field(default='Navigator conversation', min_length=1, max_length=160)


class NavigatorMessage(VersionInput):
    question: str = Field(min_length=1, max_length=2000)
    run_id: Short | None = None
