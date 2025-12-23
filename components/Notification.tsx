
import React, { useEffect } from 'react';
import { Notification as NotificationType } from '../types';

interface Props {
  notification: NotificationType;
  onClose: (id: number) => void;
}

const Notification: React.FC<Props> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(notification.id), 5000);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600'
  }[notification.type];

  return (
    <div className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-between min-w-[300px] mb-3 animate-slide-in-right`}>
      <div className="flex items-center gap-3">
        {notification.type === 'success' && <i className="fas fa-check-circle"></i>}
        {notification.type === 'error' && <i className="fas fa-exclamation-circle"></i>}
        {notification.type === 'info' && <i className="fas fa-info-circle"></i>}
        <span className="text-sm font-medium">{notification.message}</span>
      </div>
      <button onClick={() => onClose(notification.id)} className="ml-4 opacity-70 hover:opacity-100 transition-opacity">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

export default Notification;
