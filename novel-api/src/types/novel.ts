export interface Novel {
    title: string;
    author: string;
    ratings: {
        average: number;
        count: number;
    };
    stats: {
        pages: number;
        publishedYear: number;
    };
    comments: string[];
}