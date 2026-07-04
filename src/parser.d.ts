export interface AnimehayEpisode {
    title: string;
    url: string;
    /** Episode number, taken from data-no="" or the link's text content. */
    no: string;
    /** Numeric episode id parsed from id="wp-ep-NNNN". */
    episodeId: number;
}
export interface AnimehayWatchData {
    title: string;
    poster: string;
    canonicalUrl: string;
    breadcrumbSeriesUrl: string;
    breadcrumbSeriesTitle: string;
    movie_id: number;
    episode_id: number;
    episode_no: string;
    serverMap: Record<string, string>;
    activeServer: string;
    currentEpisode: AnimehayEpisode;
    episodes: AnimehayEpisode[];
    warnings: string[];
}
export interface SeriesEpisodeLink {
    title: string;
    url: string;
    id: number;
}
export interface AnimehaySeriesData {
    title: string;
    poster: string;
    episodeLinks: SeriesEpisodeLink[];
    warnings: string[];
}
export declare function parseWatchPage(html: string): AnimehayWatchData;
export declare function parseWatchPageFromDoc(doc: Document): AnimehayWatchData;
export declare function parseSeriesPage(html: string): AnimehaySeriesData;
//# sourceMappingURL=parser.d.ts.map