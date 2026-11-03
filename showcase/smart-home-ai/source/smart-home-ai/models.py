from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')


class Box(StrictModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    width: float = Field(gt=0, le=1)
    height: float = Field(gt=0, le=1)

    @model_validator(mode='after')
    def inside_page(self):
        if self.x + self.width > 1.000001 or self.y + self.height > 1.000001:
            raise ValueError('Bounding box must fit inside the full page')
        return self


class Space(StrictModel):
    id: str
    unit_id: str
    name: str
    kind: Literal['bedroom', 'living', 'kitchen', 'bathroom', 'corridor',
                  'terrace', 'lightwell', 'stairs', 'elevator', 'other']
    evidence: str
    box: Box
    certainty: Literal['clear', 'uncertain']


class Plan(StrictModel):
    sheet: str
    page_number: int = Field(ge=1)
    page_kind: Literal['floor_plan', 'other']
    area_m2: float | None
    area_scope: Literal['floor', 'unit', 'unknown']
    unit_ids: list[str]
    spaces: list[Space]
    unknowns: list[str]

    @model_validator(mode='after')
    def references(self):
        ids = [s.id for s in self.spaces]
        if len(ids) != len(set(ids)):
            raise ValueError('Duplicate space IDs')
        if len(self.unit_ids) != len(set(self.unit_ids)):
            raise ValueError('Duplicate unit IDs')
        if any(s.unit_id not in self.unit_ids + ['shared', 'unknown'] for s in self.spaces):
            raise ValueError('Unknown unit reference')
        if self.page_kind == 'floor_plan' and not self.spaces:
            raise ValueError('Floor plan must contain spaces')
        return self


class Feature(StrictModel):
    id: str
    space_id: str
    title: str
    benefit: str
    equipment_categories: list[str]
    prerequisites: list[str]
    status: Literal['conditional', 'needs_site_review']


class Action(StrictModel):
    feature_id: str
    instruction: str


class Scenario(StrictModel):
    id: str
    title: str
    trigger: str
    actions: list[Action]
    prerequisites: list[str]


class Package(StrictModel):
    name: str
    feature_ids: list[str]
    tradeoffs: list[str]


class Proposal(StrictModel):
    summary: str
    features: list[Feature]
    scenarios: list[Scenario]
    packages: list[Package]
    questions: list[str]
    limitations: list[str]

    def validate_against(self, plan: Plan, scope: str):
        spaces = {s.id for s in plan.spaces if s.unit_id == scope}
        ids = [f.id for f in self.features]
        if len(ids) != len(set(ids)):
            raise ValueError('Duplicate feature IDs')
        if any(f.space_id not in spaces for f in self.features):
            raise ValueError('Proposal crosses selected unit boundary')
        features = set(ids)
        if any(a.feature_id not in features for s in self.scenarios for a in s.actions):
            raise ValueError('Scenario references missing feature')
        if any(fid not in features for p in self.packages for fid in p.feature_ids):
            raise ValueError('Package references missing feature')
