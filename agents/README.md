# PlataPay Marketing AI Agents

Multi-agent orchestration system for AI-powered marketing automation.

## 🤖 Agent Roster

| Agent | File | Role | Trigger |
|-------|------|------|---------|
| 🎯 **MediaMax** | [media-buyer.md](./media-buyer.md) | Campaign Optimizer | `@MediaMax` |
| ✍️ **CreativeKa** | [copywriter.md](./copywriter.md) | Content Creator | `@CreativeKa` |
| 📊 **DataDito** | [analyst.md](./analyst.md) | Data Scientist | `@DataDito` |

## 🔧 Setup

### Claude Desktop

1. Copy config to Claude Desktop:
   ```bash
   # macOS
   cp /root/innovatehub-hub/claude-desktop-config.json \
      ~/Library/Application\ Support/Claude/claude_desktop_config.json
   
   # Windows
   copy /root/innovatehub-hub/claude-desktop-config.json \
      %APPDATA%\Claude\claude_desktop_config.json
   ```

2. Connect Meta Ads:
   - Open Claude Desktop
   - Go to Settings → Integrations
   - Click "Connect" on meta-ads
   - Login with your Facebook Ads account

3. Use agents:
   ```
   @DataDito Generate today's lead summary
   @CreativeKa Write 3 ad copy variants for agent recruitment
   @MediaMax Review campaign performance and recommend optimizations
   ```

### OpenClaw Integration

Agents can be spawned as sub-agents:

```
Spawn MediaMax to analyze this week's ad performance and optimize budgets
```

## 📋 Orchestration

See [orchestrator.md](./orchestrator.md) for:
- Collaboration patterns
- Communication protocols
- Tool access matrix
- Escalation rules
- Human oversight guidelines

## 🛠️ MCP Tools Available

### innovatehub-mcp (29 tools)
- Lead analytics (`get_leads_summary`)
- Email automation (`send_marketing_email`, `schedule_email`)
- Pipeline management (`update_lead_pipeline`)
- Bot flows (`get_bot_flows`, `get_ab_test_results`)
- SLA tracking (`get_sla_report`, `check_conversation_sla`)
- Data queries (`query_data`, `create_record`, `update_record`)
- DevOps (`manage_service`, `service_logs`, `git_info`)

### meta-ads-mcp (remote)
- Account management
- Campaign CRUD
- Ad set and ad management
- Performance insights
- Audience targeting
- Budget and bid control

## 📊 Quick Commands

```bash
# Today's leads
@DataDito How many leads did we get today? Break down by score tier.

# Campaign status
@MediaMax What's the CPL for each active campaign?

# New ad copy
@CreativeKa Write a Facebook ad for agent recruitment in Cavite.

# Weekly report
@DataDito Generate the weekly performance report.

# Budget optimization
@MediaMax We have ₱50K budget. How should we allocate across campaigns?

# A/B test results
@DataDito Which ad copy variants are winning? Show conversion rates.
```

## 🔗 Related Files

- `/root/innovatehub-hub/mcp-server/index.js` — MCP server implementation
- `/root/innovatehub-hub/claude-desktop-config.json` — Claude Desktop config
- `/root/innovatehub-hub/meta-ads-mcp/` — Meta Ads MCP (local backup)
- `/root/innovatehub-hub/webhook-server/server.js` — Marketing automation backend
