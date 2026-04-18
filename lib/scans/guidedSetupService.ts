import { endpoints } from '@/lib/api/endpoints';
import type {
  AnswerGuidedSetupRequest,
  CreateScanFromRecommendationRequest,
  CreateScanFromRecommendationResponse,
  GuidedSetupSessionResponse,
  GuidedSetupStepResponse,
  StartGuidedSetupRequest,
  StartGuidedSetupResponse,
} from '@/lib/api/types';

export const guidedSetupService = {
  startSession(data: StartGuidedSetupRequest): Promise<StartGuidedSetupResponse> {
    return endpoints.guidedSetup.start(data);
  },
  getSession(sessionId: string): Promise<GuidedSetupSessionResponse> {
    if (!sessionId) {
      throw new Error('sessionId is required to get guided setup session');
    }

    return endpoints.guidedSetup.get(sessionId);
  },
  submitAnswer(sessionId: string, data: AnswerGuidedSetupRequest): Promise<GuidedSetupStepResponse> {
    if (!sessionId) {
      throw new Error('sessionId is required to submit guided setup answer');
    }

    return endpoints.guidedSetup.answer(sessionId, data);
  },
  createScanFromRecommendation(
    sessionId: string,
    data: CreateScanFromRecommendationRequest = {}
  ): Promise<CreateScanFromRecommendationResponse> {
    if (!sessionId) {
      throw new Error('sessionId is required to create scan from guided setup recommendation');
    }

    return endpoints.guidedSetup.createScan(sessionId, data);
  },
};
