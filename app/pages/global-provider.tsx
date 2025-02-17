import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { getCurrentUser, getHostProfileByUserId, getRolesForUser } from "../lib/appwrite";
import { useAppwrite } from "../lib/useAppwrite";
import { HostProfile, User } from "../lib/types";

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
  // Fetch current user data using our custom hook
  const { data: userData, loading, refetch } = useAppwrite({ fn: getCurrentUser });
  const [mergedUser, setMergedUser] = useState<User | null>(null);
  const [propertyCache, setPropertyCache] = useState<{ [id: string]: any }>({});

  // Log when userData is received or updated
  useEffect(() => {
    console.log("GlobalProvider: userData changed:", userData);
  }, [userData]);

  // Merge additional data into userData and log the process
  useEffect(() => {
    const mergeUserData = async () => {
      if (userData) {
        console.log("GlobalProvider: Starting merge for user:", userData.$id);
        let updatedUser: User = { ...userData };
        try {
          const hostProfile = await getHostProfileByUserId(userData.$id);
          updatedUser.hostProfile = hostProfile as HostProfile | null;
          console.log("GlobalProvider: Fetched host profile:", hostProfile);
        } catch (error) {
          console.error("GlobalProvider: Error fetching host profile:", error);
          updatedUser.hostProfile = null;
        }
        try {
          const rolesDocs = await getRolesForUser(userData.$id);
          const roles = rolesDocs.map((doc: any) => doc.role);
          updatedUser = { ...updatedUser, roles };
          console.log("GlobalProvider: Fetched roles:", roles);
        } catch (error) {
          console.error("GlobalProvider: Error fetching roles:", error);
          updatedUser = { ...updatedUser, roles: [] };
        }
        console.log("GlobalProvider: Merged user:", updatedUser);
        setMergedUser(updatedUser);
      } else {
        console.log("GlobalProvider: No userData, setting mergedUser to null.");
        setMergedUser(null);
      }
    };
    mergeUserData();
  }, [userData]);

  // Log whenever mergedUser is updated
  useEffect(() => {
    console.log("GlobalProvider: mergedUser updated:", mergedUser);
  }, [mergedUser]);

  // Compute and log the current logged-in state
  const isLogged = !!mergedUser;
  useEffect(() => {
    console.log("GlobalProvider: isLogged =", isLogged);
  }, [isLogged]);

  // Wrap refetch to log parameters when it is called
  const wrappedRefetch = (newParams: Record<string, string | number> = {}) => {
    console.log("GlobalProvider: refetch called with params:", newParams);
    return refetch(newParams);
  };

  // Log whenever property cache is updated
  const updatePropertyCache = (property: any) => {
    if (property?.$id) {
      console.log("GlobalProvider: Updating property cache for:", property.$id);
      setPropertyCache((prev) => ({ ...prev, [property.$id]: property }));
    }
  };

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        user: mergedUser,
        loading,
        refetch: wrappedRefetch,
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
