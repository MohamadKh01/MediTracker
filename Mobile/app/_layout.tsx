import { Stack } from "expo-router";
import { KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, View } from "react-native";

export default function Layout() {
  return (
    <KeyboardAvoidingView style={{ flex: 1}} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20} >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Stack screenOptions={{ headerShown: false }} />
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}