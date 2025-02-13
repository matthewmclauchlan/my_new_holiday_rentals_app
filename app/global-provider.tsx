import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { getCurrentUser, getHostProfileByUserId, getRolesForUser } from "@/lib/appwrite";
import { useAppwrite } from "@/lib/useAppwrite";
import { HostProfile, User } from "@/lib/types";

interface GlobalContextType {
  isLogged: boolean;
  user: User | null;
  loading: boolean;
  refetch: (newParams?: Record<string, string | number>) => void;
  propertyCache: { [id: string]: any };
  updatePropertyCache: (property: any) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const { data: userData, loading, refetch } = useAppwrite({ fn: getCurrentUser });
  const [mergedUser, setMergedUser] = useState<User | null>(null);
  const [propertyCache, setPropertyCache] = useState<{ [id: string]: any }>({});

  useEffect(() => {
    const mergeUserData = async () => {
      if (userData) {
        let updatedUser: User = { ...userData };
        try {
          const hostProfile = await getHostProfileByUserId(userData.$id);
          updatedUser.hostProfile = hostProfile as HostProfile | null;
        } catch (error) {
          updatedUser.hostProfile = null;
        }
        try {
          const rolesDocs = await getRolesForUser(userData.$id);
          const roles = rolesDocs.map((doc: any) => doc.role);
          updatedUser = { ...updatedUser, roles };
        } catch (error) {
          updatedUser = { ...updatedUser, roles: [] };
        }
        setMergedUser(updatedUser);
      } else {
        setMergedUser(null);
      }
    };
    mergeUserData();
  }, [userData]);

  // Function to update the property cache
  const updatePropertyCache = (property: any) => {
    if (property?.$id) {
      setPropertyCache((prev) => ({ ...prev, [property.$id]: property }));
    }
  };

  const isLogged = !!mergedUser;
  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        user: mergedUser,
        loading,
        refetch: (newParams = {}) => refetch(newParams),
        propertyCache,
        updatePropertyCache,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = (): GlobalContextType => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }
  return context;
};

export default GlobalProvider;
