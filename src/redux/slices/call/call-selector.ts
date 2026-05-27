import { RootState } from "~/redux/store";

export const selectIncomingCall = (state: RootState) => state.call.incomingCall;
export const selectCurrentActiveCalls = (state: RootState) =>
    state.call.currentActiveCalls;
export const selectCallConsumers = (state: RootState) =>
    state.call.callConsumers;
