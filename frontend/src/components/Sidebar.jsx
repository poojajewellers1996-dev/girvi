import { NavLink } from 'react-router-dom';
import { Diamond, LayoutDashboard, PlusCircle, FolderOpen, BookOpen, Repeat, ScrollText, Settings, X, Calculator, PackageCheck, CheckCircle2, Receipt } from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'New Girvi', path: '/girvi/new', icon: PlusCircle },
    { name: 'Girvi Ledger', path: '/ledger', icon: BookOpen },
    { name: 'Release Ledger', path: '/release-ledger', icon: CheckCircle2 },
    { name: 'Stock Audit', path: '/stock-check', icon: PackageCheck },
    { name: 'Re-Pledge Girvi', path: '/re-pledge', icon: Repeat },
    { name: 'Bank Interest Ledger', path: '/repledge-interest-ledger', icon: Receipt },
    { name: 'Calculator', path: '/calculator', icon: Calculator },
    { name: 'System Logs', path: '/logs', icon: ScrollText },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];


  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Diamond color="var(--primary)" size={24} />
          GirviManager
        </div>
        <button 
          className="mobile-menu-btn" 
          onClick={() => setIsOpen(false)}
        >
          <X size={24} />
        </button>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              {item.name}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
