from pydantic import BaseModel, Field, ConfigDict, field_validator

class Message(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: str
    content: str = Field(min_length=1, max_length=4000)

    @field_validator("role")
    @classmethod
    def role_allowed(cls, value):
        if value not in ("user", "assistant"):
            raise ValueError("Only user and assistant history roles are allowed")
        return value

class Options(BaseModel):
    model_config = ConfigDict(extra="forbid")
    max_new_tokens: int = Field(default=256, ge=16, le=512)
    temperature: float = Field(default=0.7, ge=0.1, le=1.5)

class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(min_length=1, max_length=4000)
    history: list[Message] = Field(default_factory=list, max_length=12)
    options: Options = Field(default_factory=Options)

    @field_validator("question")
    @classmethod
    def not_blank(cls, value):
        if not value.strip():
            raise ValueError("Question must not be blank")
        return value.strip()

class ChatResponse(BaseModel):
    status: str = "ok"
    answer: str
    model: str
    version: str
