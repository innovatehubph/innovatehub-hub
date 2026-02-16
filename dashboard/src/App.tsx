import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Businesses from './pages/Businesses'
import Messenger from './pages/Messenger'
import BotFlows from './pages/BotFlows'
import PageManagement from './pages/PageManagement'
import Campaigns from './pages/Campaigns'
import Products from './pages/Products'
import Orders from './pages/Orders'
import TokenStore from './pages/TokenStore'
import WebhookLogs from './pages/WebhookLogs'
import Users from './pages/Users'
import FacebookSetup from './pages/FacebookSetup'
import Settings from './pages/Settings'
import AIWorkshop from './pages/AIWorkshop'

export default function App() {
  const [activeBusiness, setActiveBusiness] = useState('')

  return (
    <Layout activeBusiness={activeBusiness} onBusinessChange={setActiveBusiness}>
      <Routes>
        <Route path="/" element={<Dashboard businessId={activeBusiness} />} />
        <Route path="/businesses" element={<Businesses />} />
        <Route path="/messenger" element={<Messenger businessId={activeBusiness} />} />
        <Route path="/bot-flows" element={<BotFlows businessId={activeBusiness} />} />
        <Route path="/pages" element={<PageManagement businessId={activeBusiness} />} />
        <Route path="/campaigns" element={<Campaigns businessId={activeBusiness} />} />
        <Route path="/products" element={<Products businessId={activeBusiness} />} />
        <Route path="/orders" element={<Orders businessId={activeBusiness} />} />
        <Route path="/tokens" element={<TokenStore businessId={activeBusiness} />} />
        <Route path="/webhooks" element={<WebhookLogs businessId={activeBusiness} />} />
        <Route path="/users" element={<Users businessId={activeBusiness} />} />
        <Route path="/facebook-setup" element={<FacebookSetup businessId={activeBusiness} />} />
        <Route path="/ai-workshop" element={<AIWorkshop businessId={activeBusiness} />} />
        <Route path="/settings" element={<Settings businessId={activeBusiness} onBusinessChange={setActiveBusiness} />} />
      </Routes>
    </Layout>
  )
}
