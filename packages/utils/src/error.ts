export class AgentStackError extends Error {
  constructor(
    public code: string,
    message: string,
    public fix?: string,
    public prompt?: string,
    public statusCode = 500,
  ) {
    super(message);
    this.name = "AgentStackError";
  }
}
