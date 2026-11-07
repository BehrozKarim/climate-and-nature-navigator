from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field

from .schemas import Empty, Model
from .solana_receipts import ReceiptService


class PrepareReceipt(Model):
    expected_version: int = Field(ge=1, strict=True)
    wallet: str = Field(min_length=32, max_length=44)


class SubmitReceipt(Model):
    signed_transaction: str | None = Field(default=None, min_length=1, max_length=2000)


class VerifyBundle(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=False)
    bundle_json: str = Field(min_length=1, max_length=4 * 1024 * 1024)


def create_receipt_router(settings, store):
    router = APIRouter(prefix='/navigator/datasets/{dataset_id}', tags=['Solana Devnet receipts'])

    def service():
        return ReceiptService(store(), settings)

    @router.get('/reviews/{review_id}/receipts')
    def receipts(dataset_id: str, review_id: str):
        return service().list(dataset_id, review_id)

    @router.post('/reviews/{review_id}/receipts', status_code=201)
    def prepare(dataset_id: str, review_id: str, body: PrepareReceipt):
        return service().prepare(dataset_id, review_id, body.expected_version, body.wallet)

    @router.get('/receipts/{receipt_id}')
    def receipt(dataset_id: str, receipt_id: str):
        return service().get(dataset_id, receipt_id)

    @router.post('/receipts/{receipt_id}/submit')
    def submit(dataset_id: str, receipt_id: str, body: SubmitReceipt):
        return service().submit(dataset_id, receipt_id, body.signed_transaction)

    @router.post('/receipts/{receipt_id}/confirm')
    def confirm(dataset_id: str, receipt_id: str, body: Empty):
        return service().confirm(dataset_id, receipt_id)

    @router.get('/receipts/{receipt_id}/bundle')
    def bundle(dataset_id: str, receipt_id: str):
        return service().export(dataset_id, receipt_id)

    @router.post('/receipts/{receipt_id}/verify')
    def verify(dataset_id: str, receipt_id: str, body: VerifyBundle):
        return service().verify(dataset_id, receipt_id, body.bundle_json)

    return router
