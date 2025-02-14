import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import client from '../../lib/contentful';
import type { HelpArticle } from '../../lib/types';
import renderRichText from '../../lib/renderRichText';

export default function HelpArticleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await client.getEntries({
          content_type: 'helpArticle',
          'fields.slug': slug,
          limit: 1,
        });
        if (response.items && response.items.length > 0) {
          setArticle(response.items[0] as unknown as HelpArticle);
        } else {
          setError("No article found for the given slug.");
        }
      } catch (err) {
        console.error("Error fetching article:", err);
        setError("An error occurred while fetching the article.");
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text>Loading article...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Log fields to inspect available keys.
  console.log("Article fields:", article?.fields);

  const { title, content } = article!.fields;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Close Icon */}
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Image source={require('@/assets/icons/cross.png')} style={styles.closeIcon} />
        </TouchableOpacity>

        <Text style={styles.title}>{title || "Untitled Article"}</Text>
        {content ? renderRichText(content) : <Text>No content available.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: {
    padding: 16,
    backgroundColor: '#fff',
    paddingTop: 60, // extra padding so content doesn't hide behind the close icon
    position: 'relative',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  error: { color: 'red', fontSize: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  closeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    padding: 10,
  },
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: '#000',
  },
});
