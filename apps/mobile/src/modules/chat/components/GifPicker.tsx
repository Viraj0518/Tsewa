import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../theme/colors';
import { fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';

const TENOR_API_KEY = 'AIzaSyA_YOUR_KEY';
const TENOR_BASE_URL = 'https://tenor.googleapis.com/v2';

interface GifResult {
  id: string;
  title: string;
  previewUrl: string;
  fullUrl: string;
}

interface GifPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectGif: (url: string) => void;
}

const COLUMN_COUNT = 2;
const SCREEN_WIDTH = Dimensions.get('window').width;
const GIF_SIZE = (SCREEN_WIDTH - 48) / COLUMN_COUNT;

async function fetchGifs(query: string): Promise<GifResult[]> {
  try {
    const endpoint = query.trim()
      ? `${TENOR_BASE_URL}/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20&media_filter=gif`
      : `${TENOR_BASE_URL}/featured?key=${TENOR_API_KEY}&limit=20&media_filter=gif`;

    const response = await fetch(endpoint);

    if (!response.ok) {
      console.warn('Tenor API error:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.results) return [];

    return data.results.map((item: any) => ({
      id: item.id,
      title: item.title || '',
      previewUrl:
        item.media_formats?.tinygif?.url ||
        item.media_formats?.nanogif?.url ||
        '',
      fullUrl:
        item.media_formats?.gif?.url ||
        item.media_formats?.mediumgif?.url ||
        '',
    }));
  } catch (err) {
    console.warn('Failed to fetch GIFs:', err);
    return [];
  }
}

export function GifPicker({ visible, onClose, onSelectGif }: GifPickerProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load trending GIFs on mount
  useEffect(() => {
    if (visible) {
      loadGifs('');
    }
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [visible]);

  const loadGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    const results = await fetchGifs(searchQuery);
    if (results.length === 0 && searchQuery.trim()) {
      setError('No GIFs found. Try a different search.');
    }
    setGifs(results);
    setLoading(false);
  }, []);

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        loadGifs(text);
      }, 400);
    },
    [loadGifs]
  );

  const handleSelect = useCallback(
    (gif: GifResult) => {
      onSelectGif(gif.fullUrl || gif.previewUrl);
      onClose();
      setQuery('');
    },
    [onSelectGif, onClose]
  );

  const renderGif = useCallback(
    ({ item }: { item: GifResult }) => (
      <Pressable
        style={styles.gifItem}
        onPress={() => handleSelect(item)}
      >
        <Image
          source={{ uri: item.previewUrl }}
          style={styles.gifImage}
          resizeMode="cover"
        />
      </Pressable>
    ),
    [handleSelect]
  );

  const keyExtractor = useCallback((item: GifResult) => item.id, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.title}>Choose a GIF</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.closeButton}>Close</Text>
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleSearch}
            placeholder="Search GIFs..."
            placeholderTextColor={colors.gray400}
            autoFocus={false}
            returnKeyType="search"
          />
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.lavender} />
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : gifs.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              Search for GIFs or check your connection
            </Text>
          </View>
        ) : (
          <FlatList
            data={gifs}
            renderItem={renderGif}
            keyExtractor={keyExtractor}
            numColumns={COLUMN_COUNT}
            contentContainerStyle={[
              styles.gridContent,
              { paddingBottom: insets.bottom + 16 },
            ]}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  closeButton: {
    fontSize: fontSize.md,
    color: colors.lavender,
    fontWeight: fontWeight.medium,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  searchInput: {
    backgroundColor: colors.gray100,
    borderRadius: scale(20),
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: fontSize.md,
    color: colors.black,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.gray500,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.gray400,
    textAlign: 'center',
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  gridRow: {
    gap: 8,
    marginBottom: 8,
  },
  gifItem: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
});
