import { endpoints } from '@/lib/api/endpoints';
import type {
  ActiveGuidedSetupResponse,
  AnswerGuidedSetupRequest,
  CreateScanFromRecommendationRequest,
  CreateScanFromRecommendationResponse,
  GuidedSetupSessionResponse,
  GuidedSetupStepResponse,
  StartGuidedSetupRequest,
  StartGuidedSetupResponse,
} from '@/lib/api/types';

// A blank session id would build "/guided-setup//answer", which 404s and looks to
// the user like the chat silently failing — so every call is guarded here.
function requireSessionId(sessionId: string | null | undefined, action: string) {
  const trimmed = sessionId?.trim();
  if (!trimmed) {
    throw new Error(`sessionId is required to ${action}`);
  }

  return trimmed;
}

export const guidedSetupService = {
  startSession(data: StartGuidedSetupRequest): Promise<StartGuidedSetupResponse> {
    return endpoints.guidedSetup.start(data);
  },
  /** The saved conversation for the signed-in user, or null when there is none (204). */
  getActiveSession(): Promise<ActiveGuidedSetupResponse | null> {
    return endpoints.guidedSetup.getActive();
  },
  getSession(sessionId: string): Promise<GuidedSetupSessionResponse> {
    return endpoints.guidedSetup.get(requireSessionId(sessionId, 'get guided setup session'));
  },
  submitAnswer(sessionId: string, data: AnswerGuidedSetupRequest): Promise<GuidedSetupStepResponse> {
    return endpoints.guidedSetup.answer(
      requireSessionId(sessionId, 'submit guided setup answer'),
      data
    );
  },
  createScanFromRecommendation(
    sessionId: string,
    data: CreateScanFromRecommendationRequest = {}
  ): Promise<CreateScanFromRecommendationResponse> {
    return endpoints.guidedSetup.createScan(
      requireSessionId(sessionId, 'create scan from guided setup recommendation'),
      data
    );
  },
};
