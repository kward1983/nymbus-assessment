import { NavLink, Outlet } from 'react-router-dom';
import { useTransactionStore } from '../context/TransactionStore';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/import', label: 'Import' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/forecast', label: 'Forecast' },
];

export default function Layout() {
  const { state, dispatch } = useTransactionStore();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - hidden on mobile, visible on md+ */}
      <aside className="hidden md:flex md:flex-col md:w-60 border-r border-slate-200 bg-white">
        <div className="px-6 py-5 border-b border-slate-200">
          <h1 className="text-lg font-semibold text-black tracking-tight">
            CashFlow
          </h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:text-black hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile top bar - visible on small screens */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <h1 className="text-lg font-semibold text-black tracking-tight">
            CashFlow
          </h1>
        </header>
        <nav className="md:hidden flex border-b border-slate-200 bg-white px-2 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-600 hover:text-black'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {state.loadError && (
            <div
              role="alert"
              className="mb-4 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <span>{state.loadError}</span>
              <button
                type="button"
                onClick={() => dispatch({ type: "CLEAR_ALL" })}
                className="ml-4 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
              >
                Clear Data
              </button>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
