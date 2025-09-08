import { faker } from '@faker-js/faker';

// Application State
class PastoralApp {
  constructor() {
    this.currentTab = 'dashboard';
    this.currentDate = new Date();
    this.members = [];
    this.sermons = [];
    this.visits = [];
    this.events = [];
    this.activities = [];
    this.notifications = [];
    this.weeklyCalls = [];
    this.weekIdentifier = null;
    this.isOnline = navigator.onLine;
    this.deferredPrompt = null;
    this.notificationPermission = 'default';
    
    this.init();
  }

  init() {
    this.loadFromStorage();
    this.setupWeeklyCalls();
    this.setupEventListeners();
    this.setupServiceWorker();
    this.setupOfflineHandling();
    this.setupNotifications();
    this.setupPWA();
    this.updateUI();
    this.showTab('dashboard');
    this.scheduleNotificationChecks();
  }

  // Storage Management
  saveToStorage() {
    const data = {
      members: this.members,
      sermons: this.sermons,
      visits: this.visits,
      events: this.events,
      activities: this.activities,
      notifications: this.notifications,
      weeklyCalls: this.weeklyCalls,
      weekIdentifier: this.weekIdentifier,
      lastSaved: new Date().toISOString()
    };
    
    try {
      localStorage.setItem('pastoralAppData', JSON.stringify(data));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      this.showToast('Erreur de sauvegarde', 'Les données n\'ont pas pu être sauvegardées', 'error');
    }
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem('pastoralAppData');
      if (data) {
        const parsed = JSON.parse(data);
        this.members = parsed.members || [];
        this.sermons = parsed.sermons || [];
        this.visits = parsed.visits || [];
        this.events = parsed.events || [];
        this.activities = parsed.activities || [];
        this.notifications = parsed.notifications || [];
        this.weeklyCalls = parsed.weeklyCalls || [];
        this.weekIdentifier = parsed.weekIdentifier || null;
        
        // Convert date strings back to Date objects
        this.events.forEach(event => event.date = new Date(event.date));
        this.visits.forEach(visit => visit.date = new Date(visit.date));
        this.sermons.forEach(sermon => sermon.date = new Date(sermon.date));
        this.activities.forEach(activity => activity.date = new Date(activity.date));
        this.notifications.forEach(notification => notification.date = new Date(notification.date));
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    }
  }

  // Service Worker Setup
  setupServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker enregistré:', registration);
        })
        .catch(error => {
          console.log('Erreur Service Worker:', error);
        });
    }
  }

  // PWA Setup
  setupPWA() {
    // Installation prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallBanner();
    });

    // Check if already installed
    window.addEventListener('appinstalled', () => {
      this.hideInstallBanner();
      this.showToast('Installation réussie', 'L\'application a été installée avec succès', 'success');
    });
  }

  showInstallBanner() {
    const banner = document.getElementById('installBanner');
    banner.classList.add('show');
    
    document.getElementById('installBtn').addEventListener('click', () => {
      this.installApp();
    });
    
    document.getElementById('installClose').addEventListener('click', () => {
      this.hideInstallBanner();
    });
  }

  hideInstallBanner() {
    const banner = document.getElementById('installBanner');
    banner.classList.remove('show');
  }

  async installApp() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        this.hideInstallBanner();
      }
      
      this.deferredPrompt = null;
    }
  }

  // Offline Handling
  setupOfflineHandling() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.hideOfflineBanner();
      this.showToast('Connexion rétablie', 'Vous êtes de nouveau en ligne', 'success');
      this.syncData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showOfflineBanner();
      this.showToast('Mode hors ligne', 'Vous pouvez continuer à utiliser l\'application', 'warning');
    });
  }

  showOfflineBanner() {
    document.getElementById('offlineBanner').classList.add('show');
    document.querySelector('.header').classList.add('with-banner');
    document.querySelector('.main-content').classList.add('with-banner');
  }

  hideOfflineBanner() {
    document.getElementById('offlineBanner').classList.remove('show');
    document.querySelector('.header').classList.remove('with-banner');
    document.querySelector('.main-content').classList.remove('with-banner');
  }

  syncData() {
    // Synchronisation des données quand la connexion revient
    console.log('Synchronisation des données...');
    this.saveToStorage();
  }

  // Notifications Setup
  setupNotifications() {
    this.checkNotificationPermission();
    
    // Show permission banner if not granted
    if (this.notificationPermission === 'default') {
      setTimeout(() => this.showNotificationBanner(), 3000);
    }
    
    this.updateNotificationBadge();
  }

  checkNotificationPermission() {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  showNotificationBanner() {
    const banner = document.getElementById('notificationBanner');
    banner.classList.add('show');
    
    document.getElementById('allowNotifications').addEventListener('click', () => {
      this.requestNotificationPermission();
    });
    
    document.getElementById('denyNotifications').addEventListener('click', () => {
      this.hideNotificationBanner();
    });
  }

  hideNotificationBanner() {
    const banner = document.getElementById('notificationBanner');
    banner.classList.remove('show');
  }

  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      
      if (permission === 'granted') {
        this.showToast('Notifications activées', 'Vous recevrez des rappels pour vos événements', 'success');
        this.hideNotificationBanner();
      } else {
        this.showToast('Notifications refusées', 'Vous pouvez les activer plus tard dans les paramètres', 'warning');
      }
    }
  }

  // Schedule notification checks
  scheduleNotificationChecks() {
    // Check for upcoming events every minute
    setInterval(() => {
      this.checkUpcomingEvents();
      this.checkPendingCalls();
    }, 60000); // 1 minute

    // Initial check
    this.checkUpcomingEvents();
  }

  checkUpcomingEvents() {
    const now = new Date();
    const in30Minutes = new Date(now.getTime() + 30 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Check for events in the next 30 minutes
    this.events.forEach(event => {
      const eventDate = new Date(event.date);
      if (eventDate > now && eventDate <= in30Minutes) {
        this.addNotification(
          `Événement dans 30 minutes`,
          `${event.title} à ${event.location}`,
          'reminder',
          { eventId: event.id }
        );
        this.showSystemNotification(`Événement dans 30 minutes`, `${event.title} à ${event.location}`);
      }
    });

    // Check for visits today
    this.visits.forEach(visit => {
      if (visit.status === 'pending') {
        const visitDate = new Date(visit.date);
        if (this.isSameDay(visitDate, now) && visitDate > now && visitDate <= in1Hour) {
          this.addNotification(
            `Visite prévue dans 1 heure`,
            `Visite chez ${visit.memberName} - ${visit.purpose}`,
            'reminder',
            { visitId: visit.id }
          );
          this.showSystemNotification(`Visite dans 1 heure`, `Chez ${visit.memberName}`);
        }
      }
    });

    // Check for sermon preparation reminders
    this.sermons.forEach(sermon => {
      if (sermon.status === 'draft') {
        const sermonDate = new Date(sermon.date);
        if (this.isSameDay(sermonDate, tomorrow)) {
          this.addNotification(
            `Sermon à préparer`,
            `"${sermon.title}" prévu pour demain`,
            'reminder',
            { sermonId: sermon.id }
          );
        }
      }
    });
  }

  checkPendingCalls() {
    const todayDay = new Date().getDay(); // Sunday = 0, Saturday = 6
    if (todayDay >= 2 && todayDay <= 6) { // Tuesday to Saturday
        const urgentCalls = this.weeklyCalls.filter(c => c.status === 'urgent').length;
        if (urgentCalls > 0) {
            this.addNotification(
                `Appels urgents en attente`,
                `Vous avez ${urgentCalls} appels urgents à passer.`,
                'reminder',
                { tab: 'calling' }
            );
            this.showSystemNotification('Appels urgents', `Vous avez ${urgentCalls} appels urgents à passer.`);
        }
    }
  }

  showSystemNotification(title, body) {
    if (this.notificationPermission === 'granted' && 'Notification' in window) {
      new Notification(title, {
        body: body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'pastoral-reminder'
      });
    }
  }

  addNotification(title, message, type = 'info', data = {}) {
    // Check if notification already exists to avoid duplicates
    const exists = this.notifications.some(n => 
      n.title === title && n.message === message && 
      this.isSameDay(new Date(n.date), new Date())
    );
    
    if (!exists) {
      const notification = {
        id: Date.now(),
        title,
        message,
        type,
        date: new Date(),
        read: false,
        data
      };
      
      this.notifications.unshift(notification);
      this.updateNotificationBadge();
      this.saveToStorage();
    }
  }

  updateNotificationBadge() {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.classList.add('show');
    } else {
      badge.classList.remove('show');
    }
  }

  generateMockData() {
    // Generate mock members
    for (let i = 0; i < 25; i++) {
      this.members.push({
        id: Date.now() + i,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        joinDate: faker.date.past({ years: 5 }),
        birthDate: faker.date.past({ years: 60 }),
        notes: faker.lorem.sentences(2)
      });
    }
    
    // Generate mock sermons
    const sermonTopics = [
      'La grâce de Dieu', 'L\'amour du prochain', 'La foi en action',
      'Le pardon', 'L\'espérance chrétienne', 'La prière', 'La compassion',
      'La persévérance', 'La joie dans l\'épreuve', 'La paix intérieure'
    ];

    for (let i = 0; i < 15; i++) {
      this.sermons.push({
        id: Date.now() + i,
        title: faker.helpers.arrayElement(sermonTopics),
        scripture: this.generateScriptureReference(),
        date: faker.date.recent({ days: 30 }),
        notes: faker.lorem.paragraphs(3),
        duration: faker.number.int({ min: 20, max: 45 }),
        status: faker.helpers.arrayElement(['draft', 'ready', 'preached'])
      });
    }

    // Generate mock visits
    for (let i = 0; i < 20; i++) {
      const member = faker.helpers.arrayElement(this.members);
      this.visits.push({
        id: Date.now() + i,
        memberId: member.id,
        memberName: member.name,
        purpose: faker.helpers.arrayElement([
          'Visite de consolation', 'Visite de encouragement', 'Visite de malades',
          'Nouvelle famille', 'Suivi spirituel', 'Counseling pastoral'
        ]),
        date: faker.date.soon({ days: 14 }),
        status: faker.helpers.arrayElement(['pending', 'completed']),
        notes: faker.lorem.sentences(2),
        address: member.address
      });
    }

    // Generate mock events
    for (let i = 0; i < 30; i++) {
      this.events.push({
        id: Date.now() + i,
        title: faker.helpers.arrayElement([
          'Culte du dimanche', 'Étude biblique', 'Réunion de prière',
          'Conseil d\'église', 'Visite à l\'hôpital', 'Mariage',
          'Funérailles', 'Baptême', 'Confirmation', 'Retraite spirituelle'
        ]),
        date: faker.date.between({ 
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
          to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }),
        time: this.generateTime(),
        location: faker.helpers.arrayElement([
          'Église principale', 'Salle de réunion', 'Domicile',
          'Hôpital', 'Centre communautaire'
        ]),
        description: faker.lorem.sentences(2)
      });
    }

    // Generate mock activities
    for (let i = 0; i < 10; i++) {
      this.activities.push({
        id: Date.now() + i,
        title: faker.helpers.arrayElement([
          'Nouveau membre ajouté', 'Sermon préparé', 'Visite effectuée',
          'Réunion planifiée', 'Prière pour un malade'
        ]),
        description: faker.lorem.sentence(),
        date: faker.date.recent({ days: 7 }),
        type: faker.helpers.arrayElement(['member', 'sermon', 'visit', 'event', 'prayer'])
      });
    }

    // Sort data by date
    this.sermons.sort((a, b) => new Date(b.date) - new Date(a.date));
    this.visits.sort((a, b) => new Date(a.date) - new Date(b.date));
    this.events.sort((a, b) => new Date(a.date) - new Date(b.date));
    this.activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Save generated data
    this.saveToStorage();
  }

  generateScriptureReference() {
    const books = [
      'Matthieu', 'Marc', 'Luc', 'Jean', 'Actes', 'Romains',
      'Corinthiens', 'Galates', 'Éphésiens', 'Philippiens',
      'Colossiens', 'Thessaloniciens', 'Timothée', 'Jacques', 'Pierre'
    ];
    const book = faker.helpers.arrayElement(books);
    const chapter = faker.number.int({ min: 1, max: 28 });
    const verse = faker.number.int({ min: 1, max: 31 });
    return `${book} ${chapter}:${verse}`;
  }

  generateTime() {
    const hour = faker.number.int({ min: 7, max: 21 });
    const minute = faker.helpers.arrayElement(['00', '15', '30', '45']);
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.showTab(tab);
      });
    });

    // Quick actions
    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleQuickAction(action);
      });
    });

    // Add buttons
    document.getElementById('addMemberBtn')?.addEventListener('click', () => this.showAddMemberModal());
    document.getElementById('addSermonBtn')?.addEventListener('click', () => this.showAddSermonModal());
    document.getElementById('addVisitBtn')?.addEventListener('click', () => this.showAddVisitModal());

    // Calendar navigation
    document.getElementById('prevMonth')?.addEventListener('click', () => this.changeMonth(-1));
    document.getElementById('nextMonth')?.addEventListener('click', () => this.changeMonth(1));

    // Search functionality
    document.getElementById('memberSearch')?.addEventListener('input', (e) => {
      this.filterMembers(e.target.value);
    });

    // Visit filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.currentTarget.dataset.filter;
        this.filterVisits(filter);
        
        // Update active filter
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
      });
    });

    // Modal
    document.getElementById('modalClose')?.addEventListener('click', () => this.hideModal());
    document.getElementById('modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal') this.hideModal();
    });

    // Notifications
    document.getElementById('notificationBtn')?.addEventListener('click', () => this.toggleNotificationsPanel());
    document.getElementById('closeNotifications')?.addEventListener('click', () => this.hideNotificationsPanel());
    document.getElementById('clearNotifications')?.addEventListener('click', () => this.clearAllNotifications());
    document.getElementById('notificationSettings')?.addEventListener('click', () => this.showNotificationSettings());

    // Profile button
    document.getElementById('profileBtn')?.addEventListener('click', () => {
      this.showSettingsModal();
    });
  }

  showTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    this.currentTab = tabName;

    // Load tab-specific content
    switch (tabName) {
      case 'dashboard':
        this.updateDashboard();
        break;
      case 'calendar':
        this.updateCalendar();
        break;
      case 'members':
        this.updateMembers();
        break;
      case 'sermons':
        this.updateSermons();
        break;
      case 'visits':
        this.updateVisits();
        break;
      case 'calling':
        this.updateCallingTab();
        break;
    }
  }

  updateUI() {
    // Update current date
    const today = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    document.getElementById('dateToday').textContent = 
      today.toLocaleDateString('fr-FR', options);
    
    this.updateDashboard();
  }

  updateDashboard() {
    // Update stats
    document.getElementById('membersCount').textContent = this.members.length;
    
    const today = new Date();
    const todayEvents = this.events.filter(event => 
      this.isSameDay(new Date(event.date), today)
    );
    document.getElementById('eventsToday').textContent = todayEvents.length;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const visitsThisWeek = this.visits.filter(visit => {
      const visitDate = new Date(visit.date);
      return visitDate >= weekStart && visitDate <= weekEnd;
    });
    document.getElementById('visitsThisWeek').textContent = visitsThisWeek.length;

    // Update upcoming events
    this.updateUpcomingEvents();
    
    // Update recent activities
    this.updateRecentActivities();
  }

  updateUpcomingEvents() {
    const upcomingList = document.getElementById('upcomingList');
    upcomingList.innerHTML = '';

    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get upcoming events and visits
    const upcomingEvents = this.events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate > now && eventDate <= next7Days;
    }).slice(0, 3);

    const upcomingVisits = this.visits.filter(visit => {
      const visitDate = new Date(visit.date);
      return visit.status === 'pending' && visitDate > now && visitDate <= next7Days;
    }).slice(0, 2);

    [...upcomingEvents, ...upcomingVisits]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5)
      .forEach(item => {
        const upcomingEl = document.createElement('div');
        upcomingEl.className = 'upcoming-item';
        
        const isVisit = item.memberId !== undefined;
        const title = isVisit ? `Visite - ${item.memberName}` : item.title;
        const subtitle = isVisit ? item.purpose : `${item.time} - ${item.location}`;
        
        upcomingEl.innerHTML = `
          <div class="upcoming-info">
            <div class="upcoming-title">${title}</div>
            <div class="upcoming-time">${this.formatDateTime(item.date)} - ${subtitle}</div>
          </div>
          <div class="upcoming-actions">
            <button class="upcoming-btn secondary" onclick="app.${isVisit ? 'showVisitDetails' : 'showEventDetails'}(${item.id})">
              Voir
            </button>
            ${isVisit ? 
              `<button class="upcoming-btn primary" onclick="app.markVisitCompleted(${item.id})">Terminé</button>` :
              ''
            }
          </div>
        `;
        upcomingList.appendChild(upcomingEl);
      });

    if (upcomingList.children.length === 0) {
      upcomingList.innerHTML = '<p class="text-secondary text-center mt-2">Aucun événement à venir dans les 7 prochains jours</p>';
    }
  }

  updateRecentActivities() {
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '';

    if (this.activities.length === 0) {
        activityList.innerHTML = '<p class="text-secondary text-center mt-2">Aucune activité récente</p>';
        return;
    }

    this.activities.slice(0, 5).forEach(activity => {
      const activityEl = document.createElement('div');
      activityEl.className = 'activity-item';
      activityEl.innerHTML = `
        <div class="activity-title">${activity.title}</div>
        <div class="activity-meta">
          ${activity.description} • ${this.formatRelativeTime(activity.date)}
        </div>
      `;
      activityList.appendChild(activityEl);
    });
  }

  // Notifications Panel
  toggleNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    panel.classList.toggle('show');
    
    if (panel.classList.contains('show')) {
      this.updateNotificationsList();
    }
  }

  hideNotificationsPanel() {
    document.getElementById('notificationsPanel').classList.remove('show');
  }

  updateNotificationsList() {
    const notificationsList = document.getElementById('notificationsList');
    notificationsList.innerHTML = '';

    if (this.notifications.length === 0) {
      notificationsList.innerHTML = '<p class="text-secondary p-2 text-center">Aucune notification</p>';
      return;
    }

    this.notifications.slice(0, 20).forEach(notification => {
      const notificationEl = document.createElement('div');
      notificationEl.className = `notification-item ${!notification.read ? 'unread' : ''}`;
      notificationEl.innerHTML = `
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
        <div class="notification-time">${this.formatRelativeTime(notification.date)}</div>
      `;
      
      notificationEl.addEventListener('click', () => {
        this.markNotificationAsRead(notification.id);
        this.handleNotificationClick(notification);
      });
      
      notificationsList.appendChild(notificationEl);
    });
  }

  markNotificationAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.updateNotificationBadge();
      this.updateNotificationsList();
      this.saveToStorage();
    }
  }

  handleNotificationClick(notification) {
    if (notification.data.tab) {
      this.showTab(notification.data.tab);
    } else if (notification.data.eventId) {
      this.showTab('calendar');
    } else if (notification.data.visitId) {
      this.showTab('visits');
    } else if (notification.data.sermonId) {
      this.showTab('sermons');
    }
    this.hideNotificationsPanel();
  }

  clearAllNotifications() {
    this.notifications = [];
    this.updateNotificationBadge();
    this.updateNotificationsList();
    this.saveToStorage();
    this.showToast('Notifications effacées', 'Toutes les notifications ont été supprimées', 'success');
  }

  showNotificationSettings() {
    this.showModal('Paramètres de notification', `
      <div class="notification-settings">
        <div class="form-group">
          <label class="form-label">Rappels d'événements</label>
          <select class="form-select" id="eventReminders">
            <option value="30">30 minutes avant</option>
            <option value="60">1 heure avant</option>
            <option value="120">2 heures avant</option>
            <option value="disabled">Désactivé</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Rappels de visites</label>
          <select class="form-select" id="visitReminders">
            <option value="60">1 heure avant</option>
            <option value="120">2 heures avant</option>
            <option value="240">4 heures avant</option>
            <option value="disabled">Désactivé</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Rappels de sermons</label>
          <select class="form-select" id="sermonReminders">
            <option value="daily">Quotidien</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="disabled">Désactivé</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="app.hideModal()">Annuler</button>
          <button type="button" class="btn btn-primary" onclick="app.saveNotificationSettings()">Sauvegarder</button>
        </div>
      </div>
    `);
  }

  saveNotificationSettings() {
    // Implementation for saving notification settings
    this.showToast('Paramètres sauvegardés', 'Vos préférences de notification ont été mises à jour', 'success');
    this.hideModal();
  }

  // Toast Notifications
  showToast(title, message, type = 'info', duration = 5000) {
    // Create toast container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    `;

    // Add to container
    container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, duration);

    // Remove on click
    toast.addEventListener('click', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  }

  updateCalendar() {
    const currentMonthEl = document.getElementById('currentMonth');
    const calendarGrid = document.getElementById('calendarGrid');
    
    const monthName = this.currentDate.toLocaleDateString('fr-FR', { 
      month: 'long', 
      year: 'numeric' 
    });
    currentMonthEl.textContent = monthName;

    // Generate calendar
    calendarGrid.innerHTML = '';
    
    // Add weekdays header
    const weekdays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const weekdaysEl = document.createElement('div');
    weekdaysEl.className = 'calendar-weekdays';
    weekdays.forEach(day => {
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-weekday';
      dayEl.textContent = day;
      weekdaysEl.appendChild(dayEl);
    });
    calendarGrid.appendChild(weekdaysEl);

    // Add days
    const daysEl = document.createElement('div');
    daysEl.className = 'calendar-days';
    
    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';
      dayEl.textContent = date.getDate();
      
      if (date.getMonth() !== this.currentDate.getMonth()) {
        dayEl.style.opacity = '0.3';
      }
      
      if (this.isSameDay(date, new Date())) {
        dayEl.classList.add('today');
      }
      
      // Check for events
      const hasEvents = this.events.some(event => 
        this.isSameDay(new Date(event.date), date)
      );
      if (hasEvents) {
        dayEl.classList.add('has-events');
      }
      
      daysEl.appendChild(dayEl);
    }
    
    calendarGrid.appendChild(daysEl);
    
    // Update today's events
    this.updateTodayEvents();
  }

  updateTodayEvents() {
    const eventsList = document.getElementById('eventsList');
    eventsList.innerHTML = '';

    const today = new Date();
    const todayEvents = this.events.filter(event => 
      this.isSameDay(new Date(event.date), today)
    );

    if (todayEvents.length === 0) {
      eventsList.innerHTML = '<p class="text-secondary text-center mt-2">Aucun événement aujourd\'hui</p>';
      return;
    }

    todayEvents.forEach(event => {
      const eventEl = document.createElement('div');
      eventEl.className = 'event-item';
      eventEl.innerHTML = `
        <div class="event-title">${event.title}</div>
        <div class="event-time">${event.time} - ${event.location}</div>
      `;
      eventsList.appendChild(eventEl);
    });
  }

  updateMembers() {
    const membersList = document.getElementById('membersList');
    membersList.innerHTML = '';
    
    if (this.members.length === 0) {
        membersList.innerHTML = '<p class="text-secondary text-center mt-2">Aucun membre. Cliquez sur "+ Ajouter" pour commencer.</p>';
        return;
    }

    this.members.forEach(member => {
      const memberEl = document.createElement('div');
      memberEl.className = 'member-card';
      memberEl.innerHTML = `
        <div class="member-name">${member.name}</div>
        <div class="member-info">
          <span>📧 ${member.email}</span>
          <span>📞 ${member.phone}</span>
        </div>
      `;
      
      memberEl.addEventListener('click', () => this.showMemberDetails(member));
      membersList.appendChild(memberEl);
    });
  }

  updateSermons() {
    const sermonsList = document.getElementById('sermonsList');
    sermonsList.innerHTML = '';

    if (this.sermons.length === 0) {
        sermonsList.innerHTML = '<p class="text-secondary text-center mt-2">Aucun sermon. Cliquez sur "+ Nouveau" pour commencer.</p>';
        return;
    }

    this.sermons.forEach(sermon => {
      const sermonEl = document.createElement('div');
      sermonEl.className = 'sermon-card';
      
      const statusColors = {
        draft: 'var(--warning-color)',
        ready: 'var(--accent-color)',
        preached: 'var(--text-secondary)'
      };
      
      const statusLabels = {
        draft: 'Brouillon',
        ready: 'Prêt',
        preached: 'Prêché'
      };
      
      sermonEl.innerHTML = `
        <div class="sermon-title">${sermon.title}</div>
        <div class="sermon-meta">
          <span>📖 ${sermon.scripture}</span>
          <span>📅 ${this.formatDate(sermon.date)}</span>
          <span style="color: ${statusColors[sermon.status]}; font-weight: 500;">
            • ${statusLabels[sermon.status]}
          </span>
        </div>
      `;
      
      sermonEl.addEventListener('click', () => this.showSermonDetails(sermon));
      sermonsList.appendChild(sermonEl);
    });
  }

  updateVisits() {
    const activeFilter = document.querySelector('.visits-filters .filter-btn.active')?.dataset.filter || 'all';
    this.filterVisits(activeFilter);
  }

  filterVisits(filter) {
    const visitsList = document.getElementById('visitsList');
    visitsList.innerHTML = '';

    let filteredVisits = this.visits;
    if (filter !== 'all') {
      filteredVisits = this.visits.filter(visit => visit.status === filter);
    }
    
    if (filteredVisits.length === 0) {
        visitsList.innerHTML = `<p class="text-secondary text-center mt-2">Aucune visite ne correspond à ce filtre.</p>`;
        return;
    }

    filteredVisits.forEach(visit => {
      const visitEl = document.createElement('div');
      visitEl.className = 'visit-card';
      visitEl.innerHTML = `
        <div class="visit-title">${visit.memberName}</div>
        <div class="visit-meta">
          <span>🎯 ${visit.purpose}</span>
          <span>📅 ${this.formatDateTime(visit.date)}</span>
        </div>
        <div class="visit-status ${visit.status}">
          ${visit.status === 'pending' ? 'À faire' : 'Terminée'}
        </div>
      `;
      
      visitEl.addEventListener('click', () => this.showVisitDetails(visit));
      visitsList.appendChild(visitEl);
    });
  }

  filterMembers(searchTerm) {
    const membersList = document.getElementById('membersList');
    const memberCards = membersList.querySelectorAll('.member-card');
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    memberCards.forEach(card => {
      const memberName = card.querySelector('.member-name').textContent.toLowerCase();
      const memberInfo = card.querySelector('.member-info').textContent.toLowerCase();
      
      if (memberName.includes(lowerCaseSearchTerm) || 
          memberInfo.includes(lowerCaseSearchTerm)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  changeMonth(direction) {
    this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    this.updateCalendar();
  }

  handleQuickAction(action) {
    switch (action) {
      case 'add-event':
        this.showAddEventModal();
        break;
      case 'add-member':
        this.showAddMemberModal();
        break;
      case 'new-sermon':
        this.showAddSermonModal();
        break;
      case 'schedule-visit':
        this.showAddVisitModal();
        break;
    }
  }

  showAddMemberModal() {
    this.showModal('Ajouter un membre', `
      <form id="memberForm">
        <div class="form-group">
          <label class="form-label">Nom complet</label>
          <input type="text" class="form-input" name="name" required>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" name="email">
        </div>
        <div class="form-group">
          <label class="form-label">Téléphone</label>
          <input type="tel" class="form-input" name="phone">
        </div>
        <div class="form-group">
          <label class="form-label">Adresse</label>
          <input type="text" class="form-input" name="address">
        </div>
        <div class="form-group">
          <label class="form-label">Date de naissance</label>
          <input type="date" class="form-input" name="birthDate">
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-textarea" name="notes" placeholder="Notes sur le membre..."></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="app.hideModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">Ajouter</button>
        </div>
      </form>
    `);

    document.getElementById('memberForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      this.addMember(Object.fromEntries(formData));
    });
  }

  addMember(memberData) {
    const newMember = {
      id: Date.now(),
      name: memberData.name,
      email: memberData.email,
      phone: memberData.phone,
      address: memberData.address,
      birthDate: memberData.birthDate ? new Date(memberData.birthDate) : null,
      joinDate: new Date(),
      notes: memberData.notes || ''
    };

    this.members.push(newMember);
    this.addActivity('Nouveau membre ajouté', `${newMember.name} a rejoint l'église`);
    this.hideModal();
    this.saveToStorage();
    this.showTab('members');
    this.updateDashboard();
    this.showToast('Membre ajouté', `${newMember.name} a été ajouté avec succès`, 'success');
  }

  showAddSermonModal() {
    this.showModal('Nouveau sermon', `
      <form id="sermonForm">
        <div class="form-group">
          <label class="form-label">Titre du sermon</label>
          <input type="text" class="form-input" name="title" required>
        </div>
        <div class="form-group">
          <label class="form-label">Référence biblique</label>
          <input type="text" class="form-input" name="scripture" placeholder="Ex: Jean 3:16" required>
        </div>
        <div class="form-group">
          <label class="form-label">Date prévue</label>
          <input type="date" class="form-input" name="date" required>
        </div>
        <div class="form-group">
          <label class="form-label">Durée estimée (minutes)</label>
          <input type="number" class="form-input" name="duration" min="10" max="60" value="30">
        </div>
        <div class="form-group">
          <label class="form-label">Notes du sermon</label>
          <textarea class="form-textarea" name="notes" placeholder="Plan, points clés, illustrations..."></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="app.hideModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">Créer</button>
        </div>
      </form>
    `);

    document.getElementById('sermonForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      this.addSermon(Object.fromEntries(formData));
    });
  }

  addSermon(sermonData) {
    const newSermon = {
      id: Date.now(),
      title: sermonData.title,
      scripture: sermonData.scripture,
      date: new Date(sermonData.date),
      duration: parseInt(sermonData.duration),
      notes: sermonData.notes || '',
      status: 'draft'
    };

    this.sermons.unshift(newSermon);
    this.addActivity('Nouveau sermon créé', `"${newSermon.title}" a été ajouté`);
    this.hideModal();
    this.saveToStorage();
    this.showTab('sermons');
    this.showToast('Sermon créé', `"${newSermon.title}" a été ajouté`, 'success');
  }

  showAddVisitModal() {
    const memberOptions = this.members.map(member => 
      `<option value="${member.id}">${member.name}</option>`
    ).join('');

    this.showModal('Planifier une visite', `
      <form id="visitForm">
        <div class="form-group">
          <label class="form-label">Membre à visiter</label>
          <select class="form-select" name="memberId" required>
            <option value="">Sélectionner un membre</option>
            ${memberOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Objet de la visite</label>
          <select class="form-select" name="purpose" required>
            <option value="">Sélectionner un objet</option>
            <option value="Visite de consolation">Visite de consolation</option>
            <option value="Visite d'encouragement">Visite d'encouragement</option>
            <option value="Visite de malades">Visite de malades</option>
            <option value="Nouvelle famille">Nouvelle famille</option>
            <option value="Suivi spirituel">Suivi spirituel</option>
            <option value="Counseling pastoral">Counseling pastoral</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Date et heure</label>
          <input type="datetime-local" class="form-input" name="date" required>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-textarea" name="notes" placeholder="Points à aborder, préparation nécessaire..."></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="app.hideModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">Planifier</button>
        </div>
      </form>
    `);

    document.getElementById('visitForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      this.addVisit(Object.fromEntries(formData));
    });
  }

  addVisit(visitData) {
    const member = this.members.find(m => m.id == visitData.memberId);
    if (!member) {
        this.showToast('Erreur', 'Membre non trouvé', 'error');
        return;
    }
    const newVisit = {
      id: Date.now(),
      memberId: parseInt(visitData.memberId),
      memberName: member.name,
      purpose: visitData.purpose,
      date: new Date(visitData.date),
      status: 'pending',
      notes: visitData.notes || '',
      address: member.address
    };

    this.visits.push(newVisit);
    this.visits.sort((a, b) => new Date(a.date) - new Date(b.date));
    this.addActivity('Visite planifiée', `Visite chez ${member.name}`);
    this.hideModal();
    this.saveToStorage();
    this.showTab('visits');
    this.updateDashboard();
    this.showToast('Visite planifiée', `Visite chez ${member.name} ajoutée`, 'success');
  }

  showAddEventModal() {
    this.showModal('Nouvel événement', `
      <form id="eventForm">
        <div class="form-group">
          <label class="form-label">Titre de l'événement</label>
          <input type="text" class="form-input" name="title" required>
        </div>
        <div class="form-group">
          <label class="form-label">Date et heure</label>
          <input type="datetime-local" class="form-input" name="date" required>
        </div>
        <div class="form-group">
          <label class="form-label">Lieu</label>
          <input type="text" class="form-input" name="location" required>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-textarea" name="description" placeholder="Description de l'événement..."></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="app.hideModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">Créer</button>
        </div>
      </form>
    `);

    document.getElementById('eventForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      this.addEvent(Object.fromEntries(formData));
    });
  }

  addEvent(eventData) {
    const newEvent = {
      id: Date.now(),
      title: eventData.title,
      date: new Date(eventData.date),
      time: new Date(eventData.date).toTimeString().slice(0, 5),
      location: eventData.location,
      description: eventData.description || ''
    };

    this.events.push(newEvent);
    this.events.sort((a, b) => new Date(a.date) - new Date(b.date));
    this.addActivity('Événement créé', `"${newEvent.title}" a été planifié`);
    this.hideModal();
    this.saveToStorage();
    this.showTab('calendar');
    this.updateDashboard();
    this.showToast('Événement créé', `"${newEvent.title}" a été ajouté au calendrier`, 'success');
  }

  addActivity(title, description) {
    const newActivity = {
      id: Date.now(),
      title,
      description,
      date: new Date(),
      type: 'general'
    };

    this.activities.unshift(newActivity);
    if (this.activities.length > 20) {
      this.activities = this.activities.slice(0, 20);
    }
    this.saveToStorage();
  }

  showMemberDetails(member) {
    const age = member.birthDate ? 
      Math.floor((new Date() - new Date(member.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A';
    
    this.showModal(`Détails - ${member.name}`, `
      <div class="member-details">
        <div class="form-group"><strong>Email:</strong> ${member.email || 'N/A'}</div>
        <div class="form-group"><strong>Téléphone:</strong> ${member.phone || 'N/A'}</div>
        <div class="form-group"><strong>Adresse:</strong> ${member.address || 'N/A'}</div>
        <div class="form-group"><strong>Âge:</strong> ${age} ans</div>
        <div class="form-group"><strong>Membre depuis:</strong> ${this.formatDate(member.joinDate)}</div>
        ${member.notes ? `<div class="form-group"><strong>Notes:</strong><br>${member.notes}</div>` : ''}
        <div class="form-actions">
          <button type="button" class="btn btn-danger" onclick="app.confirmDeleteMember(${member.id})">Supprimer</button>
          <button type="button" class="btn btn-primary" onclick="app.showEditMemberModal(${member.id})">Modifier</button>
        </div>
      </div>
    `);
  }

  showSermonDetails(sermon) {
    const statusLabels = { draft: 'Brouillon', ready: 'Prêt', preached: 'Prêché' };
    this.showModal(`${sermon.title}`, `
      <div class="sermon-details">
        <div class="form-group"><strong>Référence:</strong> ${sermon.scripture}</div>
        <div class="form-group"><strong>Date:</strong> ${this.formatDate(sermon.date)}</div>
        <div class="form-group"><strong>Durée:</strong> ${sermon.duration} minutes</div>
        <div class="form-group"><strong>Statut:</strong> ${statusLabels[sermon.status]}</div>
        ${sermon.notes ? `<div class="form-group"><strong>Notes:</strong><br><div style="white-space: pre-wrap; margin-top: 8px; padding: 12px; background: var(--secondary-color); border-radius: 8px;">${sermon.notes}</div></div>` : ''}
        <div class="form-actions">
          <button type="button" class="btn btn-danger" onclick="app.confirmDeleteSermon(${sermon.id})">Supprimer</button>
          <button type="button" class="btn btn-primary" onclick="app.showEditSermonModal(${sermon.id})">Modifier</button>
        </div>
      </div>
    `);
  }

  showVisitDetails(visit) {
    this.showModal(`Visite - ${visit.memberName}`, `
      <div class="visit-details">
        <div class="form-group"><strong>Objet:</strong> ${visit.purpose}</div>
        <div class="form-group"><strong>Date:</strong> ${this.formatDateTime(visit.date)}</div>
        <div class="form-group"><strong>Adresse:</strong> ${visit.address}</div>
        <div class="form-group"><strong>Statut:</strong> <span class="visit-status ${visit.status}">${visit.status === 'pending' ? 'À faire' : 'Terminée'}</span></div>
        ${visit.notes ? `<div class="form-group"><strong>Notes:</strong><br>${visit.notes}</div>` : ''}
        <div class="form-actions">
          <button type="button" class="btn btn-danger" onclick="app.confirmDeleteVisit(${visit.id})">Supprimer</button>
          <button type="button" class="btn btn-primary" onclick="app.showEditVisitModal(${visit.id})">Modifier</button>
          ${visit.status === 'pending' ? `<button type="button" class="btn btn-primary" onclick="app.markVisitCompleted(${visit.id})">Marquer terminée</button>` : ''}
        </div>
      </div>
    `);
  }

  showEventDetails(event) {
    this.showModal(`Détails - ${event.title}`, `
      <div class="event-details">
        <div class="form-group"><strong>Date:</strong> ${this.formatDateTime(event.date)}</div>
        <div class="form-group"><strong>Lieu:</strong> ${event.location}</div>
        ${event.description ? `<div class="form-group"><strong>Description:</strong><br>${event.description}</div>` : ''}
        <div class="form-actions">
          <button type="button" class="btn btn-danger" onclick="app.confirmDeleteEvent(${event.id})">Supprimer</button>
          <button type="button" class="btn btn-primary" onclick="app.showEditEventModal(${event.id})">Modifier</button>
        </div>
      </div>
    `);
  }

  markVisitCompleted(visitId) {
    const visit = this.visits.find(v => v.id === visitId);
    if (visit) {
      visit.status = 'completed';
      this.addActivity('Visite effectuée', `Visite chez ${visit.memberName} terminée`);
      this.hideModal();
      this.saveToStorage();
      this.showTab('visits');
      this.updateDashboard();
      this.showToast('Visite terminée', `Visite chez ${visit.memberName} marquée comme terminée`, 'success');
    }
  }

  showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modal').classList.add('active');
  }

  hideModal() {
    document.getElementById('modal').classList.remove('active');
  }

  // Calling Module
  setupWeeklyCalls() {
    const currentWeekId = this.getWeekIdentifier(new Date());
    if (currentWeekId !== this.weekIdentifier) {
      this.weekIdentifier = currentWeekId;
      this.weeklyCalls = this.members.map(member => ({
        memberId: member.id,
        status: 'todo' // 'todo', 'done', 'urgent'
      }));
      this.addActivity('Nouvelle semaine d\'appels', `La liste de ${this.members.length} membres à appeler a été générée.`);
      this.saveToStorage();
    }
  }

  updateCallingTab() {
    const listEl = document.getElementById('callingList');
    const summaryEl = document.getElementById('callingSummary');
    listEl.innerHTML = '';

    if (this.weeklyCalls.length === 0) {
        listEl.innerHTML = '<p class="text-secondary text-center p-2">Aucun membre à appeler. La liste est générée chaque semaine.</p>';
        summaryEl.innerHTML = '';
        return;
    }

    const doneCount = this.weeklyCalls.filter(c => c.status === 'done').length;
    const totalCount = this.weeklyCalls.length;
    const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

    summaryEl.innerHTML = `
        <p>${doneCount} sur ${totalCount} appels effectués</p>
        <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${progress}%"></div>
        </div>
    `;

    const sortedCalls = [...this.weeklyCalls].sort((a, b) => {
        const statusOrder = { urgent: 0, todo: 1, done: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
    });

    sortedCalls.forEach(call => {
        const member = this.members.find(m => m.id === call.memberId);
        if (!member) return;

        const card = document.createElement('div');
        card.className = 'calling-card';
        card.dataset.status = call.status;

        card.innerHTML = `
            <div class="calling-card-info">
                <div class="calling-card-name">${member.name}</div>
                <a href="tel:${member.phone}" class="call-link-btn">
                    <span class="call-icon">📞</span>
                    <span>${member.phone}</span>
                </a>
            </div>
            <div class="calling-card-actions">
                <button class="call-status-btn ${call.status === 'todo' ? 'active' : ''}" data-status="todo">À faire</button>
                <button class="call-status-btn ${call.status === 'urgent' ? 'active' : ''}" data-status="urgent">Urgent</button>
                <button class="call-status-btn ${call.status === 'done' ? 'active' : ''}" data-status="done">Fait</button>
            </div>
        `;
        
        card.querySelectorAll('.call-status-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.updateCallStatus(member.id, btn.dataset.status);
            });
        });

        listEl.appendChild(card);
    });
  }

  updateCallStatus(memberId, newStatus) {
    const call = this.weeklyCalls.find(c => c.memberId === memberId);
    if (call && call.status !== newStatus) {
        call.status = newStatus;
        this.saveToStorage();
        this.updateCallingTab();
        this.showToast('Statut mis à jour', `L'appel a été marqué comme "${newStatus}".`, 'success');
    }
  }

  // Utility methods
  isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    if (days < 30) return `Il y a ${Math.floor(days / 7)} sem.`;
    return `Il y a ${Math.floor(days / 30)} mois`;
  }

  getWeekIdentifier(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  // --- NEW CRUD AND DATA MANAGEMENT FUNCTIONS ---

  showSettingsModal() {
    this.showModal('Paramètres', `
        <div class="settings-content">
            <p>Gérez les données de votre application.</p>
            <div class="form-actions" style="flex-direction: column; gap: 1rem; margin-top: 1rem;">
                <button type="button" class="btn btn-primary" id="loadDemoBtn">Charger les données de démo</button>
                <button type="button" class="btn btn-danger" id="clearDataBtn">Supprimer toutes les données</button>
            </div>
        </div>
    `);

    document.getElementById('loadDemoBtn').addEventListener('click', () => {
        if (confirm("Voulez-vous charger les données de démonstration ? Cela ajoutera des exemples de membres, sermons, etc.")) {
            this.generateMockData();
            this.showToast('Données de démo chargées', 'Les exemples ont été ajoutés.', 'success');
            this.hideModal();
            this.updateUI();
            this.showTab(this.currentTab);
        }
    });

    document.getElementById('clearDataBtn').addEventListener('click', () => {
        if (confirm("Êtes-vous sûr de vouloir supprimer TOUTES les données ? Cette action est irréversible.")) {
            this.clearAllData();
        }
    });
  }

  clearAllData() {
    this.members = [];
    this.sermons = [];
    this.visits = [];
    this.events = [];
    this.activities = [];
    this.notifications = [];
    this.weeklyCalls = [];
    this.weekIdentifier = null;
    
    localStorage.removeItem('pastoralAppData');
    this.showToast('Données supprimées', 'Toutes les données ont été effacées.', 'success');
    this.hideModal();
    this.updateUI();
    this.showTab('dashboard');
    this.updateNotificationBadge();
  }

  // --- Member CRUD ---
  confirmDeleteMember(memberId) { if (confirm(`Êtes-vous sûr de vouloir supprimer ce membre ?`)) this.deleteMember(memberId); }
  deleteMember(memberId) {
    const member = this.members.find(m => m.id === memberId);
    this.members = this.members.filter(m => m.id !== memberId);
    this.addActivity('Membre supprimé', `${member.name} a été retiré.`);
    this.saveToStorage();
    this.hideModal();
    this.showTab('members');
    this.showToast('Membre supprimé', `${member.name} a été supprimé.`, 'success');
  }
  showEditMemberModal(memberId) {
    const member = this.members.find(m => m.id === memberId);
    if (!member) return;
    const birthDateValue = member.birthDate ? new Date(member.birthDate).toISOString().split('T')[0] : '';
    this.showModal(`Modifier - ${member.name}`, `
      <form id="editMemberForm">
        <input type="hidden" name="id" value="${member.id}">
        <div class="form-group"><label class="form-label">Nom</label><input type="text" class="form-input" name="name" value="${member.name}" required></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="email" value="${member.email || ''}"></div>
        <div class="form-group"><label class="form-label">Téléphone</label><input type="tel" class="form-input" name="phone" value="${member.phone || ''}"></div>
        <div class="form-group"><label class="form-label">Adresse</label><input type="text" class="form-input" name="address" value="${member.address || ''}"></div>
        <div class="form-group"><label class="form-label">Date de naissance</label><input type="date" class="form-input" name="birthDate" value="${birthDateValue}"></div>
        <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" name="notes">${member.notes || ''}</textarea></div>
        <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="app.hideModal()">Annuler</button><button type="submit" class="btn btn-primary">Sauvegarder</button></div>
      </form>`);
    document.getElementById('editMemberForm').addEventListener('submit', (e) => { e.preventDefault(); this.updateMember(Object.fromEntries(new FormData(e.target))); });
  }
  updateMember(data) {
    const index = this.members.findIndex(m => m.id == data.id);
    if (index > -1) {
        this.members[index] = { ...this.members[index], ...data, id: parseInt(data.id), birthDate: data.birthDate ? new Date(data.birthDate) : null };
        this.saveToStorage();
        this.hideModal();
        this.showTab('members');
        this.showToast('Membre mis à jour', 'Les informations ont été sauvegardées.', 'success');
    }
  }

  // --- Sermon CRUD ---
  confirmDeleteSermon(sermonId) { if (confirm(`Êtes-vous sûr de vouloir supprimer ce sermon ?`)) this.deleteSermon(sermonId); }
  deleteSermon(sermonId) {
    const sermon = this.sermons.find(s => s.id === sermonId);
    this.sermons = this.sermons.filter(s => s.id !== sermonId);
    this.addActivity('Sermon supprimé', `"${sermon.title}" a été supprimé.`);
    this.saveToStorage();
    this.hideModal();
    this.showTab('sermons');
    this.showToast('Sermon supprimé', `"${sermon.title}" a été supprimé.`, 'success');
  }
  showEditSermonModal(sermonId) {
    const sermon = this.sermons.find(s => s.id === sermonId);
    if (!sermon) return;
    const dateValue = new Date(sermon.date).toISOString().split('T')[0];
    this.showModal(`Modifier - ${sermon.title}`, `
      <form id="editSermonForm">
        <input type="hidden" name="id" value="${sermon.id}">
        <div class="form-group"><label class="form-label">Titre</label><input type="text" class="form-input" name="title" value="${sermon.title}" required></div>
        <div class="form-group"><label class="form-label">Référence</label><input type="text" class="form-input" name="scripture" value="${sermon.scripture}" required></div>
        <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" name="date" value="${dateValue}" required></div>
        <div class="form-group"><label class="form-label">Durée (min)</label><input type="number" class="form-input" name="duration" value="${sermon.duration}"></div>
        <div class="form-group"><label class="form-label">Statut</label><select class="form-select" name="status"><option value="draft" ${sermon.status === 'draft' ? 'selected' : ''}>Brouillon</option><option value="ready" ${sermon.status === 'ready' ? 'selected' : ''}>Prêt</option><option value="preached" ${sermon.status === 'preached' ? 'selected' : ''}>Prêché</option></select></div>
        <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" name="notes">${sermon.notes || ''}</textarea></div>
        <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="app.hideModal()">Annuler</button><button type="submit" class="btn btn-primary">Sauvegarder</button></div>
      </form>`);
    document.getElementById('editSermonForm').addEventListener('submit', (e) => { e.preventDefault(); this.updateSermon(Object.fromEntries(new FormData(e.target))); });
  }
  updateSermon(data) {
    const index = this.sermons.findIndex(s => s.id == data.id);
    if (index > -1) {
        this.sermons[index] = { ...this.sermons[index], ...data, id: parseInt(data.id), date: new Date(data.date), duration: parseInt(data.duration) };
        this.sermons.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.saveToStorage();
        this.hideModal();
        this.showTab('sermons');
        this.showToast('Sermon mis à jour', 'Les informations ont été sauvegardées.', 'success');
    }
  }

  // --- Visit CRUD ---
  confirmDeleteVisit(visitId) { if (confirm(`Êtes-vous sûr de vouloir supprimer cette visite ?`)) this.deleteVisit(visitId); }
  deleteVisit(visitId) {
    const visit = this.visits.find(v => v.id === visitId);
    this.visits = this.visits.filter(v => v.id !== visitId);
    this.addActivity('Visite supprimée', `La visite chez ${visit.memberName} a été annulée.`);
    this.saveToStorage();
    this.hideModal();
    this.showTab('visits');
    this.showToast('Visite supprimée', 'La visite a été supprimée.', 'success');
  }
  showEditVisitModal(visitId) {
    const visit = this.visits.find(v => v.id === visitId);
    if (!visit) return;
    const dateValue = new Date(visit.date).toISOString().slice(0, 16);
    const memberOptions = this.members.map(m => `<option value="${m.id}" ${m.id === visit.memberId ? 'selected' : ''}>${m.name}</option>`).join('');
    this.showModal(`Modifier - Visite chez ${visit.memberName}`, `
      <form id="editVisitForm">
        <input type="hidden" name="id" value="${visit.id}">
        <div class="form-group"><label class="form-label">Membre</label><select class="form-select" name="memberId" required>${memberOptions}</select></div>
        <div class="form-group"><label class="form-label">Objet</label><input type="text" class="form-input" name="purpose" value="${visit.purpose}" required></div>
        <div class="form-group"><label class="form-label">Date et heure</label><input type="datetime-local" class="form-input" name="date" value="${dateValue}" required></div>
        <div class="form-group"><label class="form-label">Statut</label><select class="form-select" name="status"><option value="pending" ${visit.status === 'pending' ? 'selected' : ''}>À faire</option><option value="completed" ${visit.status === 'completed' ? 'selected' : ''}>Terminée</option></select></div>
        <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" name="notes">${visit.notes || ''}</textarea></div>
        <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="app.hideModal()">Annuler</button><button type="submit" class="btn btn-primary">Sauvegarder</button></div>
      </form>`);
    document.getElementById('editVisitForm').addEventListener('submit', (e) => { e.preventDefault(); this.updateVisit(Object.fromEntries(new FormData(e.target))); });
  }
  updateVisit(data) {
    const index = this.visits.findIndex(v => v.id == data.id);
    if (index > -1) {
        const member = this.members.find(m => m.id == data.memberId);
        this.visits[index] = { ...this.visits[index], ...data, id: parseInt(data.id), memberId: parseInt(data.memberId), date: new Date(data.date), memberName: member.name, address: member.address };
        this.visits.sort((a, b) => new Date(a.date) - new Date(b.date));
        this.saveToStorage();
        this.hideModal();
        this.showTab('visits');
        this.showToast('Visite mise à jour', 'Les informations ont été sauvegardées.', 'success');
    }
  }
  
  // --- Event CRUD ---
  confirmDeleteEvent(eventId) { if (confirm(`Êtes-vous sûr de vouloir supprimer cet événement ?`)) this.deleteEvent(eventId); }
  deleteEvent(eventId) {
    const event = this.events.find(e => e.id === eventId);
    this.events = this.events.filter(e => e.id !== eventId);
    this.addActivity('Événement supprimé', `"${event.title}" a été supprimé.`);
    this.saveToStorage();
    this.hideModal();
    this.showTab('calendar');
    this.showToast('Événement supprimé', `"${event.title}" a été supprimé.`, 'success');
  }
  showEditEventModal(eventId) {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return;
    const dateValue = new Date(event.date).toISOString().slice(0, 16);
    this.showModal(`Modifier - ${event.title}`, `
      <form id="editEventForm">
        <input type="hidden" name="id" value="${event.id}">
        <div class="form-group"><label class="form-label">Titre</label><input type="text" class="form-input" name="title" value="${event.title}" required></div>
        <div class="form-group"><label class="form-label">Date et heure</label><input type="datetime-local" class="form-input" name="date" value="${dateValue}" required></div>
        <div class="form-group"><label class="form-label">Lieu</label><input type="text" class="form-input" name="location" value="${event.location}" required></div>
        <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" name="description">${event.description || ''}</textarea></div>
        <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="app.hideModal()">Annuler</button><button type="submit" class="btn btn-primary">Sauvegarder</button></div>
      </form>`);
    document.getElementById('editEventForm').addEventListener('submit', (e) => { e.preventDefault(); this.updateEvent(Object.fromEntries(new FormData(e.target))); });
  }
  updateEvent(data) {
    const index = this.events.findIndex(e => e.id == data.id);
    if (index > -1) {
        this.events[index] = { ...this.events[index], ...data, id: parseInt(data.id), date: new Date(data.date), time: new Date(data.date).toTimeString().slice(0, 5) };
        this.events.sort((a, b) => new Date(a.date) - new Date(b.date));
        this.saveToStorage();
        this.hideModal();
        this.showTab('calendar');
        this.showToast('Événement mis à jour', 'Les informations ont été sauvegardées.', 'success');
    }
  }
}

// Initialize the application
const app = new PastoralApp();

// Make app globally available for event handlers
window.app = app;
