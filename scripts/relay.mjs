// Test delivery service: opaque bytes, explicit audience, no cryptographic key.
// Not FrameUp's production authorization or HTTP server.
export class Relay {
  constructor(){this.events=new Map();this.revoked=new Set();}
  put(event){
    const existing=this.events.get(event.id);
    if(existing){if(JSON.stringify(existing)!==JSON.stringify(event))throw new Error('EVENT_ID_REUSED');return existing;}
    this.events.set(event.id,structuredClone(event));return event;
  }
  deliver(id,recipient){if(this.revoked.has(recipient))throw new Error('ACCESS_REVOKED');return structuredClone(this.events.get(id));}
  revoke(recipient){this.revoked.add(recipient);}
  snapshot(){return JSON.stringify({events:[...this.events],revoked:[...this.revoked]});}
  static restore(serialized){const s=JSON.parse(serialized);const r=new Relay();r.events=new Map(s.events);r.revoked=new Set(s.revoked);return r;}
}
