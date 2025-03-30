import React, { createContext, useState, useContext, useEffect } from 'react';
import pb from '../pocketbase';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Load user data when component mounts
  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (pb.authStore.isValid) {
          const userData = await pb.collection('users').getOne(pb.authStore.model.id);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      }
    };

    fetchUser();
  }, []);

  // Handle login
  const login = async (authData) => {
    try {
      const auth = await pb.collection('users').authWithPassword(
        authData.email,
        authData.password
      );
      const userData = await pb.collection('users').getOne(auth.record.id);
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  // Handle logout
  const logout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};