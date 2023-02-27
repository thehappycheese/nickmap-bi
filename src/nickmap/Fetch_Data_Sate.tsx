export type Fetch_Data_State = { type: "IDLE"; } | { type: "PENDING"; } | { type: "SUCCESS"; } | { type: "FAILED"; reason: string; };
