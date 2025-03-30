import React, { createContext, useState, useContext, useEffect } from 'react';
import pb from '../pocketbase';
import { useUser } from './UserContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({});
  const { user } = useUser(); // We'll use the UserContext here

  // Load cart from database when user changes
  useEffect(() => {
    const loadCart = async () => {
      if (user?.id) {
        try {
          const userData = await pb.collection('users').getOne(user.id);
          setCart(userData.cart || {});
        } catch (error) {
          console.error('Error loading cart:', error);
          setCart({});
        }
      } else {
        setCart({});
      }
    };

    loadCart();
  }, [user]);

  // Update both local state and database
  const updateCart = async (newCart) => {
    setCart(newCart);
    if (user?.id) {
      try {
        await pb.collection('users').update(user.id, { cart: newCart });
      } catch (error) {
        console.error('Error updating cart:', error);
      }
    }
  };
  // update local cart state
  const updateLocalCart = (newCart) => {
    setCart(newCart);
  };

  return (
    <CartContext.Provider value={{ cart, updateCart, updateLocalCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};