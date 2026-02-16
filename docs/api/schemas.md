# Data Schemas

Back4App classes (MongoDB collections) used by InnovateHub.

## Core Classes

### Business
| Field | Type | Description |
|-------|------|-------------|
| name | String | Business display name |
| slug | String | URL-safe identifier |
| fbPageId | String | Facebook Page ID |
| fbAppId | String | Facebook App ID |
| status | String | active / inactive |

### Conversation
| Field | Type | Description |
|-------|------|-------------|
| business | Pointer\<Business\> | Parent business |
| participantId | String | Facebook user PSID |
| participantName | String | User display name |
| lastMessage | String | Preview of last message |
| lastMessageAt | Date | Timestamp of last message |
| unreadCount | Number | Unread messages |
| status | String | active / archived |

### Message
| Field | Type | Description |
|-------|------|-------------|
| business | Pointer\<Business\> | Parent business |
| conversation | Pointer\<Conversation\> | Parent conversation |
| senderId | String | Facebook sender PSID |
| text | String | Message content |
| attachments | Array | Media attachments |
| direction | String | inbound / outbound |
| isBot | Boolean | Sent by bot flow |

### FbLead
| Field | Type | Description |
|-------|------|-------------|
| business | Pointer\<Business\> | Parent business |
| leadgenId | String | Facebook leadgen ID |
| name | String | Lead full name |
| email | String | Lead email address |
| phone | String | Lead phone number |
| formName | String | Lead form name |
| adId | String | Associated ad ID |

### Product
| Field | Type | Description |
|-------|------|-------------|
| business | Pointer\<Business\> | Parent business |
| name | String | Product name |
| description | String | Product description |
| price | Number | Price in PHP |
| currency | String | Currency code |
| imageUrl | String | Product image URL |
| category | String | Product category |
| status | String | active / inactive |
| fbProductId | String | Facebook catalog product ID |

### Order
| Field | Type | Description |
|-------|------|-------------|
| business | Pointer\<Business\> | Parent business |
| product | Pointer\<Product\> | Ordered product |
| customerId | String | Customer identifier |
| quantity | Number | Order quantity |
| total | Number | Order total |
| status | String | pending / confirmed / shipped / delivered |
| fbOrderId | String | Facebook order ID |

### AdCampaign
| Field | Type | Description |
|-------|------|-------------|
| business | Pointer\<Business\> | Parent business |
| name | String | Campaign name |
| objective | String | Marketing objective |
| status | String | active / paused / completed |
| budget | Number | Campaign budget |
| spend | Number | Amount spent |
| impressions | Number | Total impressions |
| clicks | Number | Total clicks |

### WebhookLog
| Field | Type | Description |
|-------|------|-------------|
| business | Pointer\<Business\> | Parent business |
| eventType | String | Facebook event type |
| source | String | Source identifier |
| payload | Object | Raw webhook JSON |
| status | String | processed / pending / failed |

### BotFlow
| Field | Type | Description |
|-------|------|-------------|
| business | Pointer\<Business\> | Parent business |
| name | String | Flow name |
| trigger | Object | Trigger configuration |
| steps | Array | Flow steps |
| isActive | Boolean | Flow enabled |

### FbPage
| Field | Type | Description |
|-------|------|-------------|
| business | Pointer\<Business\> | Parent business |
| pageId | String | Facebook Page ID |
| pageName | String | Page display name |
| accessToken | String | Page access token |
| category | String | Page category |

### Token
| Field | Type | Description |
|-------|------|-------------|
| business | Pointer\<Business\> | Parent business |
| tokenType | String | page / user / app |
| accessToken | String | The token value |
| expiresAt | Date | Token expiry date |
| status | String | valid / expiring / expired |
| scope | Array | Token permissions |

### AIGeneration
| Field | Type | Description |
|-------|------|-------------|
| business | Pointer\<Business\> | Parent business |
| prompt | String | User's feature request |
| plan | String | AI-generated plan |
| files | Array | Generated file list |
| status | String | generated / staged / deployed / failed |
| qaScore | Number | QA review score |
