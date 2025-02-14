import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Image,
} from "react-native";
import { login, account, config } from "@/lib/appwrite";
import { useRouter } from "expo-router";
import { useGlobalContext } from "./global-provider";
import icons from "@/constants/icons";

/**
 * Helper function that calls Appwrite’s REST API to create an email session.
 * Note: Ensure that config.endpoint includes the "/v1" part.
 */
const createEmailSession = async (email: string, password: string) => {
  // Ensure the endpoint contains "/v1"
  const endpoint = config.endpoint.includes("/v1")
    ? config.endpoint
    : `${config.endpoint}/v1`;
  const url = `${endpoint}/account/sessions/email`;

  const response = await fetch(url, {
    method: "POST",
  credentials: "include", // ensures cookies are sent
  headers: { "Content-Type": "application/json", "X-Appwrite-Project": config.projectId },
  body: JSON.stringify({ email, password }),
});
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }
  const data = await response.json();
  return data;
};

const Auth = () => {
  const { refetch, loading, isLogged } = useGlobalContext();
  const router = useRouter();

  // State for Email Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Redirect to home if already logged in
  useEffect(() => {
    if (!loading && isLogged) {
      console.log("✅ User is already logged in, redirecting...");
      router.replace("/(guest)/guestTabs");
    }
  }, [isLogged, loading]);

  // Google OAuth login handler remains unchanged
  const handleLogin = async () => {
    const result = await login();
    if (result) {
      console.log("🔄 Google Login successful, refreshing session...");
      await refetch();
      setTimeout(() => {
        console.log("✅ Redirecting to home...");
        router.replace("/(guest)/guestTabs");
      }, 500);
    } else {
      Alert.alert("Error", "Failed to login with Google");
    }
  };

  // Email login handler using the custom createEmailSession helper
  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }
    try {
      // Optionally, delete any existing session to avoid sending stale tokens.
      try {
        await account.deleteSession("current");
      } catch (err) {
        console.log("Auth: No current session to delete, continuing...");
      }
      
      const session = await createEmailSession(email, password);
      if (session) {
        console.log("🔄 Email Login successful, refreshing session...");
        await refetch();
        setTimeout(() => {
          console.log("✅ Redirecting to home...");
          router.replace("/(guest)/guestTabs");
        }, 500);
      } else {
        Alert.alert("Error", "Failed to login with email");
      }
    } catch (error: any) {
      console.error("❌ Email Login Error:", error);
      Alert.alert("Error", error.message || "Failed to login with email");
    }
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
        <View className="px-10">
          <Text className="text-base text-center uppercase font-rubik text-black-200">
            Welcome To Real Scout
          </Text>
          <Text className="text-3xl font-rubik-bold text-black-300 text-center mt-2">
            Let's Get You Closer To {"\n"}
            <Text className="text-primary-300">Your Ideal Home</Text>
          </Text>

          {/* Email Login Section */}
          <Text className="text-lg font-rubik text-black-200 text-center mt-10">
            Login with Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            className="border border-gray-300 rounded-full py-3 px-4 mt-3"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            className="border border-gray-300 rounded-full py-3 px-4 mt-3"
            secureTextEntry
          />
          <TouchableOpacity
            onPress={handleEmailLogin}
            className="bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-5"
          >
            <View className="flex flex-row items-center justify-center">
              <Text className="text-lg font-rubik-medium text-black-300">
                Continue with Email
              </Text>
            </View>
          </TouchableOpacity>

          {/* Google Login Section */}
          <Text className="text-lg font-rubik text-black-200 text-center mt-10">
            Or, Login with Google
          </Text>
          <TouchableOpacity
            onPress={handleLogin}
            className="bg-white shadow-md shadow-zinc-300 rounded-full w-full py-4 mt-5"
          >
            <View className="flex flex-row items-center justify-center">
              <Image
                source={icons.google}
                className="w-5 h-5"
                resizeMode="contain"
              />
              <Text className="text-lg font-rubik-medium text-black-300 ml-2">
                Continue with Google
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Auth;
