import React, { createContext, useContext, useState, useEffect } from 'react';

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
    dashboardTitle: 'मुख्य नियंत्रण कक्ष (डॅशबोर्ड)',
    welcomeAdmin: 'स्वागत आहे, श्री ल.रा. कोळी',
    adminRoleBadge: 'मुख्य प्रशासक (Super Admin)',
    noticeNoResidentLogin: 'सूचना: हे केवळ अधिकृत प्रशासकासाठी राखीव पोर्टल आहे.',
    langSwitch: 'English',
    statusActive: 'सक्रिय',
    securityNotice: 'डेटा सुरक्षा: HttpOnly कुकी व CSRF संरक्षण सक्रिय'
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
    securityNotice: 'Data Security: HttpOnly Cookies & Anti-CSRF Shields Enabled'
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
