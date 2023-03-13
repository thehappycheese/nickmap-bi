export type Fetch_Data_State = 
{ type: "IDLE"; }
| { type: "PENDING"; }
| { type: "MISSING INPUT"; reason: string; }
| { type: "SUCCESS"; }
| { type: "FAILED"; reason: string; };
