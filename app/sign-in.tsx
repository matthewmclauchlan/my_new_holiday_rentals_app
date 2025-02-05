import React, { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { login } from "@/lib/appwrite";
import { useRouter } from "expo-router";
import { useGlobalContext } from "./global-provider"; // Ensure global-provider exports a default or named export properly
import icons from "@/constants/icons";
import images from "@/constants/images";

const Auth = () => {
  const { refetch, loading, isLogged } = useGlobalContext();
  const router = useRouter();

  // Redirect to home if already logged in
  useEffect(() => {
    if (!loading && isLogged) {
      console.log("✅ User is already logged in, redirecting...");
      router.replace("/(guest)/guestTabs");
    }
  }, [isLogged, loading]);

  const handleLogin = async () => {
    const result = await login();
    if (result) {
      console.log("🔄 Login successful, refreshing session...");
      await refetch(); // Ensures session is recognized immediately

      // Adding a slight delay for Appwrite session recognition
      setTimeout(() => {
        console.log("✅ Redirecting to home...");
        router.replace("/(guest)/guestTabs");
      }, 500);
    } else {
      Alert.alert("Error", "Failed to login");
    }
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerStyle={{ height: "100%" }}>
        <Image
          source={images.onboarding}
          className="w-full h-4/6"
          resizeMode="contain"
        />

        <View className="px-10">
          <Text className="text-base text-center uppercase font-rubik text-black-200">
            Welcome To Real Scout
          </Text>

          <Text className="text-3xl font-rubik-bold text-black-300 text-center mt-2">
            Let's Get You Closer To {"\n"}
            <Text className="text-primary-300">Your Ideal Home</Text>
          </Text>

          <Text className="text-lg font-rubik text-black-200 text-center mt-12">
            Login to Real Scout with Google
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
