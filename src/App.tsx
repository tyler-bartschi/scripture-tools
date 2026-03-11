import './App.css'
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { ToasterProvider } from './Toaster'
import { Record } from './Record'

const navLinks = [
  { path: '/record', label: 'Record' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/ask', label: 'Ask' },
]

function NavBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activePath = pathname === '/' ? '/record' : pathname

  return (
    <nav className="primary-nav">
      {navLinks.map((link) => {
        const isActive = activePath === link.path
        return (
          <button
            key={link.path}
            className={`nav-btn ${isActive ? 'nav-btn-active' : ''}`}
            type="button"
            onClick={() => navigate(link.path)}
          >
            {link.label}
          </button>
        )
      })}
    </nav>
  )
}

function PlaceholderPage({ heading, copy }: { heading: string; copy: string }) {
  return (
    <section className="form-panel placeholder-panel">
      <div className="form-header">
        <div>
          <h2>{heading}</h2>
        </div>
      </div>
      <p>{copy}</p>
    </section>
  )
}

function AppLayout() {
  return (
    <div className="app-shell">
      <NavBar />
      <Routes>
        <Route path="/" element={<Record />} />
        <Route path="/record" element={<Record />} />
        <Route
          path="/analytics"
          element={
            <PlaceholderPage
              heading="Analytics (Coming Soon)"
              copy="We are preparing scripture analytics so you can uncover trends and insights."
            />
          }
        />
        <Route
          path="/ask"
          element={
            <PlaceholderPage
              heading="Ask The Scriptures"
              copy="Ask about divine names or titles and we will display related scripture moments shortly."
            />
          }
        />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <ToasterProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ToasterProvider>
  )
}

export default App
