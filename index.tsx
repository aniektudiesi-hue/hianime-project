import { ScrollView, Text, View, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Modal } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

const MEGAPLAY_BASE = "https://megaplay.buzz/stream/s-2";
const API_PROXY = "https://3000-ipm9tz5vhueh54k0vpadn-994e8f0d.sg1.manus.computer";

interface Anime {
  name: string;
  animeId: string;
  image: string;
}

interface Episode {
  episodeId: string;
  episodeNumber: string;
  episodeName: string;
}

// Parse HTML using regex (same as website)
const parseAnimeFromHTML = (html: string): Anime[] => {
  const animeList: Anime[] = [];
  
  // Match the flw-item divs with anime data
  const itemRegex = /<div[^>]*class="[^"]*flw-item[^"]*"[\s\S]*?<a[^>]*class="[^"]*film-poster-ahref[^"]*"[^>]*data-id="([^"]*)"[^>]*title="([^"]*)"[\s\S]*?<img[^>]*class="[^"]*film-poster-img[^"]*"[^>]*data-src="([^"]*)"/g;

  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    const animeId = match[1];
    const name = match[2];
    let image = match[3];

    // Make image URL absolute
    if (image && !image.startsWith("http")) {
      image = "https://hianime.to" + image;
    }

    if (name && animeId && image) {
      animeList.push({ name, animeId, image });
    }
  }

  return animeList;
};

// Parse episodes from HTML (same as website)
const parseEpisodesFromHTML = (html: string): Episode[] => {
  const episodeList: Episode[] = [];
  
  // Match episode items
  const itemRegex = /<a[^>]*class="[^"]*ep-item[^"]*"[^>]*data-id="([^"]*)"[^>]*data-number="([^"]*)"[\s\S]*?<div[^>]*class="[^"]*ep-name[^"]*"[^>]*>([^<]*)<\/div>/g;

  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    const episodeId = match[1];
    const episodeNumber = match[2];
    const episodeName = match[3].trim();

    if (episodeId) {
      episodeList.push({ episodeId, episodeNumber, episodeName });
    }
  }

  return episodeList;
};

export default function HomeScreen() {
  const colors = useColors();
  const [searchQuery, setSearchQuery] = useState("One Piece");
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [language, setLanguage] = useState<"sub" | "dub">("sub");

  // Search anime - exact same logic as website
  const searchAnime = useCallback(async (query: string, page: number = 1) => {
    try {
      setLoading(true);
      
      const url = `${API_PROXY}/api/anime/search?keyword=${encodeURIComponent(query)}&page=${page}`;
      console.log("Fetching:", url);

      const response = await fetch(url);
      const data = await response.json();

      if (data.html) {
        const animeList = parseAnimeFromHTML(data.html);
        console.log(`Found ${animeList.length} anime`);
        setAnime(animeList);
        setCurrentPage(page);
      } else {
        setAnime([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setAnime([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch episodes - exact same logic as website
  const fetchEpisodes = useCallback(async (animeId: string, animeName: string, animeImage: string) => {
    try {
      setEpisodesLoading(true);
      setSelectedAnime({ name: animeName, animeId, image: animeImage });

      const url = `${API_PROXY}/api/anime/episodes?animeId=${animeId}`;
      console.log("Fetching episodes:", url);

      const response = await fetch(url);
      const data = await response.json();

      if (data.html) {
        const episodeList = parseEpisodesFromHTML(data.html);
        console.log(`Found ${episodeList.length} episodes`);
        setEpisodes(episodeList);
        setShowEpisodesModal(true);
      } else {
        setEpisodes([]);
      }
    } catch (error) {
      console.error("Episodes error:", error);
      setEpisodes([]);
    } finally {
      setEpisodesLoading(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    searchAnime("One Piece", 1);
  }, [searchAnime]);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground mb-2">🎬 HiAnime</Text>
          <Text className="text-sm text-muted">Stream anime with MegaPlay.buzz</Text>
        </View>

        {/* Search Bar */}
        <View className="mb-6 flex-row gap-2">
          <TextInput
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              color: colors.foreground,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
            placeholder="Search anime..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" }}
            onPress={() => searchAnime(searchQuery, 1)}
          >
            <Text style={{ color: colors.background, fontWeight: "bold" }}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.muted, marginTop: 10 }}>Loading anime...</Text>
          </View>
        )}

        {/* Anime Grid */}
        {!loading && anime.length > 0 && (
          <View>
            <Text style={{ color: colors.muted, marginBottom: 12, fontSize: 12 }}>
              Found {anime.length} anime
            </Text>
            <FlatList
              data={anime}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={{ gap: 12 }}
              contentContainerStyle={{ gap: 12 }}
              keyExtractor={(item) => item.animeId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    overflow: "hidden",
                    borderColor: colors.border,
                    borderWidth: 1,
                  }}
                  onPress={() => fetchEpisodes(item.animeId, item.name, item.image)}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: "100%", height: 200, backgroundColor: colors.border }}
                  />
                  <View style={{ padding: 10 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontWeight: "bold",
                        fontSize: 13,
                        marginBottom: 4,
                      }}
                      numberOfLines={2}
                    >
                      {item.name}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11 }}>ID: {item.animeId}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* No results */}
        {!loading && anime.length === 0 && (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ color: colors.muted }}>No anime found</Text>
          </View>
        )}

        {/* Pagination */}
        {!loading && anime.length > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 20, marginBottom: 20 }}>
            <TouchableOpacity
              style={{
                backgroundColor: currentPage === 1 ? colors.border : colors.primary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 6,
              }}
              onPress={() => searchAnime(searchQuery, Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <Text style={{ color: colors.background, fontWeight: "bold" }}>← Prev</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.foreground, paddingVertical: 8 }}>Page {currentPage}</Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}
              onPress={() => searchAnime(searchQuery, currentPage + 1)}
            >
              <Text style={{ color: colors.background, fontWeight: "bold" }}>Next →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Episodes Modal */}
      <Modal visible={showEpisodesModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)" }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.background,
              marginTop: 40,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "bold", flex: 1 }} numberOfLines={1}>
                Episodes - {selectedAnime?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowEpisodesModal(false)}>
                <Text style={{ color: colors.primary, fontSize: 24 }}>×</Text>
              </TouchableOpacity>
            </View>

            {episodesLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 40 }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={episodes}
                numColumns={2}
                columnWrapperStyle={{ gap: 10 }}
                contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
                keyExtractor={(item) => item.episodeId}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: colors.surface,
                      borderRadius: 8,
                      padding: 12,
                      borderColor: colors.border,
                      borderWidth: 1,
                    }}
                    onPress={() => {
                      setSelectedEpisode(item);
                      setLanguage("sub");
                      setShowEpisodesModal(false);
                      setShowPlayerModal(true);
                    }}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "bold", marginBottom: 4 }}>
                      Ep {item.episodeNumber}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 4 }}>
                      ID: {item.episodeId}
                    </Text>
                    {item.episodeName && (
                      <Text style={{ color: colors.foreground, fontSize: 10 }} numberOfLines={2}>
                        {item.episodeName}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Player Modal */}
      <Modal visible={showPlayerModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: 40, paddingHorizontal: 16, paddingBottom: 20 }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "bold", flex: 1 }} numberOfLines={1}>
                {selectedAnime?.name} - Ep {selectedEpisode?.episodeNumber}
              </Text>
              <TouchableOpacity onPress={() => setShowPlayerModal(false)}>
                <Text style={{ color: colors.primary, fontSize: 24 }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Language Selector */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: language === "sub" ? colors.primary : colors.surface,
                  paddingVertical: 10,
                  borderRadius: 6,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
                onPress={() => setLanguage("sub")}
              >
                <Text
                  style={{
                    color: language === "sub" ? colors.background : colors.foreground,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  SUB (Japanese)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: language === "dub" ? colors.primary : colors.surface,
                  paddingVertical: 10,
                  borderRadius: 6,
                  borderColor: colors.border,
                  borderWidth: 1,
                }}
                onPress={() => setLanguage("dub")}
              >
                <Text
                  style={{
                    color: language === "dub" ? colors.background : colors.foreground,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  DUB (English)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Video Player Container */}
            <View
              style={{
                width: "100%",
                height: 250,
                backgroundColor: colors.surface,
                borderRadius: 12,
                overflow: "hidden",
                marginBottom: 16,
                borderColor: colors.border,
                borderWidth: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 12 }}>
                🎬 MegaPlay.buzz Streaming
              </Text>
              <Text style={{ color: colors.foreground, fontSize: 12, textAlign: "center", paddingHorizontal: 20 }}>
                {MEGAPLAY_BASE}/{selectedEpisode?.episodeId}/{language}
              </Text>
            </View>

            {/* Stream Info */}
            <View style={{ backgroundColor: colors.surface, borderRadius: 8, padding: 12, borderColor: colors.border, borderWidth: 1 }}>
              <Text style={{ color: colors.primary, fontWeight: "bold", marginBottom: 12, fontSize: 14 }}>
                📺 Stream Information
              </Text>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Anime:</Text>
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "500" }}>
                  {selectedAnime?.name}
                </Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Episode:</Text>
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "500" }}>
                  Episode {selectedEpisode?.episodeNumber}
                </Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Episode ID:</Text>
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "500", fontFamily: "monospace" }}>
                  {selectedEpisode?.episodeId}
                </Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Language:</Text>
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "500" }}>
                  {language === "sub" ? "Japanese (SUB)" : "English (DUB)"}
                </Text>
              </View>

              <View style={{ marginBottom: 12, paddingTop: 12, borderTopColor: colors.border, borderTopWidth: 1 }}>
                <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Stream URL:</Text>
                <Text style={{ color: colors.primary, fontSize: 11, fontFamily: "monospace" }}>
                  {MEGAPLAY_BASE}/{selectedEpisode?.episodeId}/{language}
                </Text>
              </View>

              {selectedEpisode?.episodeName && (
                <View style={{ marginBottom: 12, paddingTop: 12, borderTopColor: colors.border, borderTopWidth: 1 }}>
                  <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 4 }}>Episode Name:</Text>
                  <Text style={{ color: colors.foreground, fontSize: 13 }}>
                    {selectedEpisode.episodeName}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
