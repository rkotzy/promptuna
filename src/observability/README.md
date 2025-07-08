# Observability Module

Telemetry, analytics, and monitoring for tracking SDK performance and behavior.

## Purpose

- Track end-to-end request performance and timing
- Monitor routing decisions for A/B testing analysis
- Capture token usage and cost metrics
- Log errors and fallback attempts with full context

## Files

- **`types.ts`** - Observability types (`PromptunaObservability`, `TokenUsage`, `Timings`, `BuilderInit`)
- **`builder.ts`** - `ObservabilityBuilder` class for constructing telemetry events
- **`timer.ts`** - `ObservabilityTimer` for high-resolution performance timing
- **`index.ts`** - Public exports

## Key Features

- **Performance timing** - Tracks template rendering, provider response, and total duration
- **Routing analytics** - Records variant selection reasons and experiment context
- **Token tracking** - Monitors LLM token usage for cost analysis
- **Fallback monitoring** - Logs failed attempts and provider switching
- **Builder pattern** - Mutable builder accumulates data as request progresses

## Event Structure

Telemetry events include:
- Request identification (ID, user, timestamp)
- Prompt and variant selection details
- Performance timings for each stage
- Provider information and token usage
- Success/error status with full context
- A/B testing and experiment metadata