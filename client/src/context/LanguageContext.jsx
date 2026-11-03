import React, { createContext, useContext, useState } from 'react';

const translations = {
  mr: {
    appName: 'शिवनेरी क्लासिक अपार्टमेंट',
    wing: 'ए विंग',
    location: 'औरंगाबाद रोड, पंचवटी, नाशिक, महाराष्ट्र',
    superAdminPortal: 'मुख्य प्रशासक प्रवेशद्वार',
    adminName: 'श्री ल.रा. कोळी',
    adminDesignation: 'चेअरमन / सोसायटी सेक्रेटरी',
    loginTitle: 'प्रशासक लॉगिन',
    loginSubtitle: 'सोसायटी देखभाल व पावती व्यवस्थापनासाठी आपले क्रेडेंशियल्स प्रविष्ट करा',
    usernameLabel: 'वापरकर्तानाव',
    usernamePlaceholder: 'आपले वापरकर्तानाव प्रविष्ट करा',
    passwordLabel: 'पासवर्ड',
    passwordPlaceholder: 'आपला गुप्त पासवर्ड प्रविष्ट करा',
    loginButton: 'लॉगिन करा',
    loggingIn: 'प्रमाणित होत आहे...',
    logoutButton: 'लॉगआउट',
    dashboardTitle: 'मुख्य नियंत्रण कक्ष',
    welcomeAdmin: 'स्वागत आहे, श्री ल.रा. कोळी',
    adminRoleBadge: 'मुख्य प्रशासक (Super Admin)',
    noticeNoResidentLogin: 'सूचना: हे केवळ अधिकृत प्रशासकासाठी राखीव पोर्टल आहे.',
    langSwitch: 'English',
    statusActive: 'सक्रिय',
    statusInactive: 'निष्क्रिय',
    securityNotice: 'डेटा सुरक्षा: HttpOnly कुकी व CSRF संरक्षण सक्रिय',
    navDashboard: 'नियंत्रण कक्ष',
    navResidents: 'सभासद नोंदवही',
    residentsTitle: 'सभासद नोंदवही (मास्टर डेटा)',
    residentsSubtitle: 'शिवनेरी क्लासिक अपार्टमेंट - ए विंग मधील सर्व सभासदांची अधिकृत माहिती',
    addResident: 'नवीन सभासद जोडा',
    searchPlaceholder: 'नाव किंवा सदनिका क्रमांकाने शोधा...',
    filterAll: 'सर्व (All)',
    filterActive: 'सक्रिय (Active)',
    filterInactive: 'निष्क्रिय (Inactive)',
    colSrNo: 'अ.क्र.',
    colName: 'सभासदाचे नाव',
    colFlat: 'सदनिका क्र.',
    colWing: 'विंग',
    colContact: 'मोबाईल / संपर्क',
    colStatus: 'स्थिती',
    colActions: 'कृती',
    btnEdit: 'संपादित करा',
    btnView: 'तपशील',
    btnDeactivate: 'निष्क्रिय करा',
    btnActivate: 'सक्रिय करा',
    modalAddTitle: 'नवीन सभासद नोंदणी',
    modalEditTitle: 'सभासद माहिती संपादन',
    modalViewTitle: 'सभासद तपशील',
    fieldFullName: 'पूर्ण नाव (मराठी)',
    fieldFlatNo: 'सदनिका क्र.',
    fieldWing: 'इमारत विंग',
    fieldMobile: 'मोबाईल क्रमांक',
    fieldEmail: 'ईमेल पत्ता',
    fieldAddress: 'पर्यायी पत्ता',
    fieldNotes: 'नोंद / शेरा',
    btnSave: 'जतन करा',
    btnSaving: 'जतन होत आहे...',
    btnCancel: 'रद्द करा',
    emptyResidents: 'कोणतेही सभासद आढळले नाहीत.',
    confirmDeactivate: 'तुम्हाला खात्री आहे का की हा सभासद निष्क्रिय करायचा आहे?',
    confirmActivate: 'तुम्हाला खात्री आहे का की हा सभासद सक्रिय करायचा आहे?',
    notAvailable: 'रिक्त (Blank)',
    initialRosterBadge: '१६ मूळ सभासद मास्टर डेटा'
  },
  en: {
    appName: 'Shivneri Classic Apartment',
    wing: 'A Wing',
    location: 'Aurangabad Road, Panchavati, Nashik, Maharashtra',
    superAdminPortal: 'Super Admin Portal',
    adminName: 'Shri Laxman Koli',
    adminDesignation: 'Chairman / Building Secretary',
    loginTitle: 'Administrator Login',
    loginSubtitle: 'Enter your credentials to manage society maintenance and receipts',
    usernameLabel: 'Username',
    usernamePlaceholder: 'Enter your username',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your secure password',
    loginButton: 'Sign In',
    loggingIn: 'Authenticating...',
    logoutButton: 'Logout',
    dashboardTitle: 'Management Dashboard',
    welcomeAdmin: 'Welcome, Shri Laxman Koli',
    adminRoleBadge: 'Sole Super Admin',
    noticeNoResidentLogin: 'Notice: This portal is exclusively reserved for the authorized Building Secretary.',
    langSwitch: 'मराठी',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    securityNotice: 'Data Security: HttpOnly Cookies & Anti-CSRF Shields Enabled',
    navDashboard: 'Dashboard',
    navResidents: 'Residents',
    residentsTitle: 'Resident Registry (Master Data)',
    residentsSubtitle: 'Official resident master records for Shivneri Classic Apartment - A Wing',
    addResident: 'Add New Resident',
    searchPlaceholder: 'Search by name or flat number...',
    filterAll: 'All',
    filterActive: 'Active',
    filterInactive: 'Inactive',
    colSrNo: 'Sr.No.',
    colName: 'Member Name',
    colFlat: 'Flat No.',
    colWing: 'Wing',
    colContact: 'Mobile / Contact',
    colStatus: 'Status',
    colActions: 'Actions',
    btnEdit: 'Edit',
    btnView: 'View',
    btnDeactivate: 'Deactivate',
    btnActivate: 'Activate',
    modalAddTitle: 'Add New Resident',
    modalEditTitle: 'Edit Resident Details',
    modalViewTitle: 'Resident Details',
    fieldFullName: 'Full Name (Marathi)',
    fieldFlatNo: 'Flat Number',
    fieldWing: 'Building Wing',
    fieldMobile: 'Mobile Number',
    fieldEmail: 'Email Address',
    fieldAddress: 'Alternate Address',
    fieldNotes: 'Notes / Remarks',
    btnSave: 'Save Record',
    btnSaving: 'Saving...',
    btnCancel: 'Cancel',
    emptyResidents: 'No residents found.',
    confirmDeactivate: 'Are you sure you want to deactivate this resident?',
    confirmActivate: 'Are you sure you want to activate this resident?',
    notAvailable: 'Blank',
    initialRosterBadge: '16 Original Resident Records'
  }
};

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  // Marathi is strictly the primary default language
  const [lang, setLang] = useState('mr');

  const toggleLanguage = () => {
    setLang(prev => (prev === 'mr' ? 'en' : 'mr'));
  };

  const t = (key) => {
    return translations[lang]?.[key] || translations.mr[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
