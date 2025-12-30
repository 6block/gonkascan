from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Any
from backend.models import ( 
    InferenceResponse, 
    ParticipantDetailsResponse, 
    TimelineResponse, 
    ModelsResponse, 
    ParticipantInferencesResponse, 
    TransactionResponse, 
    ParticipantMapResponse,
    AssetsResponse,
    AddressTransactionsResponse,
    ModelEpochSeriesResponse,
    ModelEpochTokenUsageResponse,
    HardwaresResponse,
    HardwareDetailsResponse,
    HardwareEpochSeriesResponse
)

router = APIRouter(prefix="/v1")

inference_service: Optional[Any] = None


def set_inference_service(service):
    global inference_service
    inference_service = service


@router.get("/hello")
def hello():
    return {"message": "hello"}


@router.get("/inference/current", response_model=InferenceResponse)
async def get_current_inference_stats(reload: bool = False):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        return await inference_service.get_current_epoch_stats(reload=reload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch current epoch stats: {str(e)}")


@router.get("/inference/epochs/{epoch_id}", response_model=InferenceResponse)
async def get_epoch_inference_stats(epoch_id: int, height: Optional[int] = None):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if epoch_id < 1:
        raise HTTPException(status_code=400, detail="Invalid epoch ID")
    
    if height is not None and height < 1:
        raise HTTPException(status_code=400, detail="Invalid height")
    
    try:
        return await inference_service.get_historical_epoch_stats(epoch_id, height=height)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch epoch {epoch_id} stats: {str(e)}")

@router.get("/participants/map", response_model=ParticipantMapResponse)
async def get_participants_map():
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        return await inference_service.get_participants_map()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch participants map: {str(e)}")

@router.get("/address/assets/{address}", response_model=AssetsResponse)
async def get_address_assets(address: str,):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        return await inference_service.get_address_assets(address=address)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch participants assets: {str(e)}")

@router.get("/participants/{participant_id}", response_model=ParticipantDetailsResponse)
async def get_participant_details(
    participant_id: str,
    epoch_id: int = Query(..., description="Epoch ID (required)"),
    height: Optional[int] = Query(None, description="Block height (optional)")
):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if epoch_id < 1:
        raise HTTPException(status_code=400, detail="Invalid epoch ID")
    
    if height is not None and height < 1:
        raise HTTPException(status_code=400, detail="Invalid height")
    
    try:
        details = await inference_service.get_participant_details(
            participant_id=participant_id,
            epoch_id=epoch_id,
            height=height
        )
        
        if details is None:
            raise HTTPException(
                status_code=404,
                detail=f"Participant {participant_id} not found in epoch {epoch_id}"
            )
        
        return details
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch participant details: {str(e)}"
        )


@router.get("/timeline", response_model=TimelineResponse)
async def get_timeline():
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        return await inference_service.get_timeline()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch timeline: {str(e)}")


@router.get("/models/current", response_model=ModelsResponse)
async def get_current_models():
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        return await inference_service.get_current_models()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch current models: {str(e)}")


@router.get("/models/epochs/{epoch_id}", response_model=ModelsResponse)
async def get_historical_models(epoch_id: int, height: Optional[int] = None):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if epoch_id < 1:
        raise HTTPException(status_code=400, detail="Invalid epoch ID")
    
    if height is not None and height < 1:
        raise HTTPException(status_code=400, detail="Invalid height")
    
    try:
        return await inference_service.get_historical_models(epoch_id, height)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch models for epoch {epoch_id}: {str(e)}")


@router.get("/models/token-usage", response_model=ModelEpochTokenUsageResponse)
async def get_model_token_usage(model: str = Query(...)):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        return await inference_service.get_model_token_usage(model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch models token-usage: {str(e)}")


@router.get("/participants/{participant_id}/inferences", response_model=ParticipantInferencesResponse)
async def get_participant_inferences(
    participant_id: str,
    epoch_id: int = Query(..., description="Epoch ID (required)")
):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if epoch_id < 1:
        raise HTTPException(status_code=400, detail="Invalid epoch ID")
    
    try:
        inferences = await inference_service.get_participant_inferences_summary(
            epoch_id=epoch_id,
            participant_id=participant_id
        )
        return inferences
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch inferences: {str(e)}"
        )


@router.get("/participants/{participant_id}/status")
async def get_address_assets(
    participant_id: str, 
    epoch_id: Optional[int] = Query(None, description="Epoch ID (required)")
):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        return await inference_service.is_participant_in_epoch(participant_index=participant_id, epoch_id=epoch_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch participant status in epoch: {str(e)}")


@router.get("/hardware/current", response_model=HardwaresResponse)
async def get_current_hardware():
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        return await inference_service.get_current_hardware()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch current hardware: {str(e)}")


@router.get("/hardware/epochs/{epoch_id}", response_model=HardwaresResponse)
async def get_historical_hardware(epoch_id: int, height: Optional[int] = None):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if epoch_id < 1:
        raise HTTPException(status_code=400, detail="Invalid epoch ID")
    
    if height is not None and height < 1:
        raise HTTPException(status_code=400, detail="Invalid height")
    
    try:
        return await inference_service.get_historical_hardware(epoch_id, height)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch hardware for epoch {epoch_id}: {str(e)}")


@router.get("/hardware/{hardware}", response_model=HardwareDetailsResponse)
async def get_hardware_details(
    hardware: str, 
    epoch_id: int = Query(..., description="Epoch ID (required)")
):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        return await inference_service.get_hardware_details(hardware, epoch_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch hardware detail: {str(e)}")


@router.get("/transactions", response_model=TransactionResponse)
async def get_transactions():
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        return await inference_service.get_transactions()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")

@router.get("/transactions/{address}", response_model=AddressTransactionsResponse)
async def get_transactions(address: str):
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    try:
        return await inference_service.get_transaction_by_address(address)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")


@router.get("/metrics/models",response_model=ModelEpochSeriesResponse)
async def get_models_metrics():
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        return await inference_service.get_model_epoch_series()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch models metrics: {str(e)}")

@router.get("/metrics/hardware", response_model=HardwareEpochSeriesResponse)
async def get_hardware_metrics():
    if inference_service is None:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    try:
        return await inference_service.get_hardware_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch hardware metrics: {str(e)}")