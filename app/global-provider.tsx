import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { getCurrentUser, getHostProfileByUserId, getRolesForUser } from "@/lib/appwrite";
import { useAppwrite } from "@/lib/useAppwrite";
import { HostProfile, User } from "@/lib/types";

interface GlobalContextType {
  isLogged: boolean;
  user: User | null;
  loading: boolean;
  refetch: (newParams?: Record<string, string | number>) => void;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider = ({ children }: GlobalProviderProps) => {
  const { data: userData, loading, refetch } = useAppwrite({ fn: getCurrentUser });
  const [mergedUser, setMergedUser] = useState<User | null>(null);

  useEffect(() => {
    console.log("GlobalProvider: userData fetched =", userData);
    const mergeUserData = async () => {
      if (userData) {
        // Start with the user data we already have.
        // We'll add a hostProfile and roles to the user.
        let updatedUser: User = { ...userData };
        console.log("GlobalProvider: Merging host profile for user:", userData.$id);
        try {
          const hostProfile = await getHostProfileByUserId(userData.$id);
          console.log("GlobalProvider: Fetched host profile =", hostProfile);
          updatedUser.hostProfile = hostProfile as HostProfile | null;
        } catch (error) {
          console.error("GlobalProvider: Error fetching host profile:", error);
          updatedUser.hostProfile = null;
        }
        try {
          const rolesDocs = await getRolesForUser(userData.$id);
          // Assuming each document has a "role" field
          const roles = rolesDocs.map((doc: any) => doc.role);
          updatedUser = { ...updatedUser, roles };
        } catch (error) {
          console.error("GlobalProvider: Error fetching roles:", error);
          updatedUser = { ...updatedUser, roles: [] };
        }
        setMergedUser(updatedUser);
        console.log("GlobalProvider: Merged user updated =", updatedUser);
      } else {
        console.log("GlobalProvider: No userData, setting mergedUser to null");
        setMergedUser(null);
      }
    };
    mergeUserData();
  }, [userData]);

  const isLogged = !!mergedUser;
  console.log("GlobalProvider: isLogged =", isLogged);

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        user: mergedUser,
        loading,
        refetch: (newParams = {}) => {
          console.log("GlobalProvider: refetch called with", newParams);
          return refetch(newParams);
        },
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
