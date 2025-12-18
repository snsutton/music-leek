# AI Agent Development Guidelines

> **For human contributors:** Learn more about the AGENTS.md convention at https://agents.md/

## Core Principle
**When in doubt, ask.** Don't make assumptions about architecture, tooling, or implementation details.

## Required Questions Before Action

### Tooling & Setup
- Which libraries or patterns should I follow?
- What's the preferred file structure?
- Do you want comprehensive mocks or minimal test setup?

### Implementation Choices
- If there are multiple valid approaches, present options and ask which to use
- If a feature could be implemented multiple ways, describe the tradeoffs and ask for preference
- If adding new dependencies, ask first

### Complexity & Scope
- Start simple and ask before adding complexity
- Ask if you want full test coverage or just specific scenarios
- Confirm the scope before building comprehensive solutions

## Default Behavior
- Prefer simple over complex
- Prefer minimal over comprehensive
- Prefer asking over assuming
- Only add what's explicitly requested
- Don't use emojis

## This Project
- Discord bot for music sharing/voting leagues
- TypeScript, discord.js
- Testing: Jest
- Ask before adding more tooling or frameworks
