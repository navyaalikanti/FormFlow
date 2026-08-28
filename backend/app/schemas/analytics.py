from __future__ import annotations
from uuid import UUID
from pydantic import BaseModel

class DistributionItem(BaseModel):
    option: str
    optionValue: str | None = None
    count: int
    percentage: float

class FieldAnalytics(BaseModel):
    fieldId: UUID
    fieldLabel: str
    fieldType: str
    totalValidResponses: int
    distribution: list[DistributionItem]

class FormAnalyticsResponse(BaseModel):
    formId: UUID
    totalResponses: int
    fields: list[FieldAnalytics]
