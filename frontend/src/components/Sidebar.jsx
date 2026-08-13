import { NavLink } from 'react-router-dom';
import { Diamond, LayoutDashboard, PlusCircle, FolderOpen, BookOpen, Repeat, ScrollText, Settings } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'New Girvi', path: '/girvi/new', icon: PlusCircle },
    { name: 'Girvi Ledger', path: '/ledger', icon: BookOpen },
    { name: 'Re-Pledge Girvi', path: '/re-pledge', icon: Repeat },
    { name: 'System Logs', path: '/logs', icon: ScrollText },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Diamond color="var(--primary)" size={24} />
          GirviManager
        </div>
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
