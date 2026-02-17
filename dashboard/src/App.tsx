import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Parse from './config/parse'
import Layout from './components/Layout'
import Login from './pages/Login'
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
import LeadMagnets from './pages/LeadMagnets'
import NurtureSequences from './pages/NurtureSequences'
import AgentPipeline from './pages/AgentPipeline'

export default function App() {
  const [activeBusiness, setActiveBusiness] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    try {
      const user = Parse.User.current();
      setLoggedIn(!!user);
    } catch {
      setLoggedIn(false);
    }
    setAuthChecked(true);
  }, [])

  if (!authChecked) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-400">Loading...</div>
    </div>;
  }

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

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
        <Route path="/lead-magnets" element={<LeadMagnets businessId={activeBusiness} />} />
        <Route path="/nurture-sequences" element={<NurtureSequences businessId={activeBusiness} />} />
        <Route path="/agent-pipeline" element={<AgentPipeline businessId={activeBusiness} />} />
        <Route path="/ai-workshop" element={<AIWorkshop businessId={activeBusiness} />} />
        <Route path="/settings" element={<Settings businessId={activeBusiness} onBusinessChange={setActiveBusiness} />} />
      </Routes>
    </Layout>
  )
}
