# Multi-Agent Orchestrator

## Overview

This document defines the orchestration patterns for the PlataPay/InnovateHub marketing AI team. Three specialized agents work together under human oversight to optimize marketing operations.

## Agent Roster

| Agent | Name | Role | Primary Focus |
|-------|------|------|---------------|
| 🎯 Media Buyer | MediaMax | Campaign Optimizer | Ads, budgets, bids, audiences |
| ✍️ Copywriter | CreativeKa | Content Creator | Copy, emails, bot flows, brand voice |
| 📊 Analyst | DataDito | Data Scientist | Reports, insights, forecasting |

## Collaboration Patterns

### Pattern 1: Campaign Launch

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Analyst   │────▶│  Copywriter │────▶│ Media Buyer │
│   DataDito  │     │  CreativeKa │     │  MediaMax   │
└─────────────┘     └─────────────┘     └─────────────┘
     │                    │                    │
     │ Audience           │ Ad Copy            │ Campaign
     │ Research           │ Variations         │ Setup
     │                    │                    │
     └────────────────────┴────────────────────┘
                          │
                    ┌─────▼─────┐
                    │   HUMAN   │
                    │  APPROVAL │
                    └───────────┘
```

**Workflow:**
1. **DataDito** analyzes past performance, identifies target audience segments
2. **CreativeKa** writes ad copy variants based on audience insights
3. **MediaMax** configures campaign with budget, bidding, targeting
4. **Human** reviews and approves before launch

### Pattern 2: Weekly Optimization

```
┌─────────────┐
│   Analyst   │──────┐
│   DataDito  │      │
└─────────────┘      │
                     ▼
              ┌──────────────┐
              │   ANALYSIS   │
              │    REPORT    │
              └──────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Media Buyer │ │  Copywriter │ │   HUMAN     │
│  MediaMax   │ │  CreativeKa │ │  DECISION   │
└─────────────┘ └─────────────┘ └─────────────┘
        │            │
        │ Budget     │ New Copy
        │ Adjustments│ Variants
        │            │
        └────────────┴────────────▶ Implementation
```

**Workflow:**
1. **DataDito** generates weekly performance report
2. Report triggers parallel actions:
   - **MediaMax** adjusts budgets and bids based on data
   - **CreativeKa** refreshes underperforming ad copy
   - **Human** reviews strategic recommendations
3. Changes implemented after approval

### Pattern 3: Issue Response

```
┌──────────────────────────────────────────┐
│              ALERT DETECTED              │
│  (SLA breach, CPL spike, low open rate)  │
└──────────────────────────────────────────┘
                     │
                     ▼
              ┌─────────────┐
              │   Analyst   │
              │   DataDito  │
              └─────────────┘
                     │
                     │ Root Cause Analysis
                     │
                     ▼
        ┌────────────────────────┐
        │     ISSUE CATEGORY     │
        └────────────────────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
      ▼              ▼              ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│ Ad Issue  │  │Copy Issue │  │ Escalate  │
│ MediaMax  │  │CreativeKa │  │ to Human  │
└───────────┘  └───────────┘  └───────────┘
```

**Workflow:**
1. Alert triggered by monitoring system
2. **DataDito** performs root cause analysis
3. Routes to appropriate agent:
   - Ad performance → **MediaMax**
   - Content/engagement → **CreativeKa**
   - Strategic/unknown → **Human**

## Communication Protocol

### Inter-Agent Messages

Agents communicate via structured handoffs:

```json
{
  "from": "DataDito",
  "to": "MediaMax",
  "type": "recommendation",
  "priority": "high",
  "context": {
    "metric": "CPL",
    "current": 145,
    "target": 100,
    "trend": "increasing"
  },
  "recommendation": "Pause Campaign X, reallocate budget to Campaign Y",
  "data": { ... },
  "confidence": 0.85
}
```

### Escalation Rules

| Condition | Action |
|-----------|--------|
| Confidence < 70% | Escalate to human |
| Budget change > 30% | Require human approval |
| New campaign launch | Human approval required |
| Negative ROAS | Immediate human alert |
| Policy violation risk | Block + human review |

## MCP Configuration

### Claude Desktop Setup

Copy to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or appropriate path:

```json
{
  "mcpServers": {
    "innovatehub": {
      "command": "node",
      "args": ["/root/innovatehub-hub/mcp-server/index.js"],
      "env": {}
    },
    "meta-ads": {
      "url": "https://mcp.pipeboard.co/meta-ads-mcp"
    }
  }
}
```

### Agent Selection Prompts

**To invoke Media Buyer:**
```
@MediaMax Analyze current campaign performance and recommend optimizations.
```

**To invoke Copywriter:**
```
@CreativeKa Write 3 ad copy variants for agent recruitment targeting Batangas.
```

**To invoke Analyst:**
```
@DataDito Generate weekly performance report with lead funnel analysis.
```

**Multi-agent task:**
```
Launch a new agent recruitment campaign:
1. @DataDito identify top-performing audience segments from Q1
2. @CreativeKa write ad copy variants for each segment
3. @MediaMax configure campaign with ₱50,000 monthly budget
```

## Tool Access Matrix

| Tool | MediaMax | CreativeKa | DataDito |
|------|:--------:|:----------:|:--------:|
| **meta-ads-mcp** |
| get_campaigns | ✅ | 🔍 | 🔍 |
| get_insights | ✅ | 🔍 | ✅ |
| update_campaign | ✅ | ❌ | ❌ |
| get_ad_creatives | 🔍 | ✅ | 🔍 |
| **innovatehub-mcp** |
| get_leads_summary | ✅ | 🔍 | ✅ |
| get_email_analytics | 🔍 | ✅ | ✅ |
| send_marketing_email | ❌ | ✅ | ❌ |
| get_bot_flows | ❌ | ✅ | ✅ |
| get_ab_test_results | 🔍 | ✅ | ✅ |
| get_sla_report | 🔍 | 🔍 | ✅ |
| update_lead_pipeline | ❌ | ❌ | ✅ |
| query_data | ✅ | 🔍 | ✅ |

Legend: ✅ Primary | 🔍 Read-only | ❌ No access

## Scheduled Tasks

| Task | Agent | Frequency | Time (Manila) |
|------|-------|-----------|---------------|
| Daily Flash Report | DataDito | Daily | 8:00 AM |
| SLA Check | DataDito | Every 30 min | - |
| Budget Pacing Check | MediaMax | Daily | 9:00 AM |
| Creative Refresh Review | CreativeKa | Weekly | Monday 10 AM |
| Weekly Performance Report | DataDito | Weekly | Monday 8 AM |
| A/B Test Analysis | DataDito | Weekly | Wednesday 2 PM |
| Monthly Business Review | All | Monthly | 1st Monday |

## Human Oversight

### Always Require Approval
- Campaign launches
- Budget changes > ₱10,000
- New audience targeting
- Creative policy changes
- Bulk email sends > 500 recipients

### Human Review Triggers
- Agent confidence < 70%
- Recommendation conflicts between agents
- Performance anomalies
- New patterns not in training data

### Emergency Stop
Human can issue `STOP` command to:
- Pause all active campaigns
- Hold all scheduled emails
- Freeze budget changes
- Generate incident report
