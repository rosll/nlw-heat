import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as AuthSessions from 'expo-auth-session'
import { api } from '../services/api'

const CLIENT_ID = '467ea5555631227795b0'
const SCOPE = 'read:user' 
const USER_STORAGE = '@mobile:user'
const TOKEN_STORAGE = '@mobile:token'

type User = {
  id: string;
  avatar_url: string;
  name: string;
  login: string;
}

type AuthContextData = {
  user: User | null;
  isSignin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

type AuthProviderProps = {
  children: React.ReactNode;
}

type AuthResponse = {
  token: string;
  user: string;
}

type AuthorizationResponse = {
  params: {
    code?: string;
    error?: string;
  },
  type?: string;

}

export const AuthContext = createContext({} as AuthContextData)

function AuthProvider({ children }: AuthProviderProps){
  const [isSignin, setIsSignin] = useState(false)
  const [user, setUser] = useState<User | null>(null)


  
  async function signIn(){
    try {
      setIsSignin(true)
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPE}`
      const authSessionResponse = await AuthSessions.startAsync({ authUrl }) as AuthorizationResponse
      
      if (authSessionResponse.type === 'success' && authSessionResponse.params.error !== 'access_denied'){
        const authResponse = await api.post('/authenticate', { code: authSessionResponse.params.code })
        const { user, token } = authResponse.data as AuthResponse
        
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        await AsyncStorage.setItem(USER_STORAGE, JSON.stringify(user))
        await AsyncStorage.setItem(TOKEN_STORAGE, token);
        
        setUser(user)
      }
    } catch (error) {
      console.log(error)
    } finally {
      setIsSignin(false)
    }

  }

  async function signOut(){
    setUser(null)
    await AsyncStorage.removeItem(USER_STORAGE)
    await AsyncStorage.removeItem(TOKEN_STORAGE)
  }

  useEffect(() => {
    async function loadUserStorageData(){
      const userStorage = await AsyncStorage.getItem(USER_STORAGE)
      const tokenStorage = await AsyncStorage.getItem(TOKEN_STORAGE)

      if (userStorage && tokenStorage){
        api.defaults.headers.common['Authorization'] = `Bearer ${tokenStorage}`
        setUser(JSON.parse(userStorage))
      }

      setIsSignin(false)
    }

    loadUserStorageData()
  }, [])

  return (
    <AuthContext.Provider value={{
      signIn,
      signOut,
      user,
      isSignin,
    }}>
      {children}
    </ AuthContext.Provider>
  )
}

function useAuth(){
  const context = useContext(AuthContext)

  return context
}

export { AuthProvider, useAuth }