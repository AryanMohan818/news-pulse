import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import AgglomerativeClustering

def generate_cluster_label(tfidf_matrix, cluster_indices, feature_names, top_n=3):
    """
    Given a matrix of articles and the row indices belonging to a specific cluster,
    calculates the average TF-IDF score for every word and extracts the top N
    highest-weight terms to act as a human-readable topic headline.
    """
    # Subset the matrix to only articles in this cluster
    cluster_vectors = tfidf_matrix[cluster_indices]
    
    # Calculate average TF-IDF weight per term across the cluster
    mean_weights = np.asarray(cluster_vectors.mean(axis=0)).flatten()
    
    # Get the indices of the top N highest-scoring terms
    top_indices = mean_weights.argsort()[-top_n:][::-1]
    
    top_words = [feature_names[i] for i in top_indices]
    
    # Join into Title Cased label: e.g. "Gaza Ceasefire Hostages"
    return " ".join(top_words).title()


def cluster_articles(articles, distance_threshold=0.65):
    """
    Takes a list of article database dictionary rows (must contain 'id', 'title', 'summary', 'content').
    Groups them into semantic topic clusters.
    
    Returns a list of cluster dictionaries:
    [
        {"label": "SpaceX Rocket Launch", "article_ids": [101, 104, 112]},
        ...
    ]
    """
    if not articles:
        return []
        
    # If only 1 article exists, put it in its own singleton cluster
    if len(articles) == 1:
        return [{
            "label": articles[0]["title"][:30],
            "article_ids": [articles[0]["id"]]
        }]
        
    print(f"\n🧠 Running TF-IDF & Agglomerative Clustering on {len(articles)} articles...")
    
    # 1. Combine title, summary, and content into a single text corpus per article
    # Giving extra weight to titles by repeating them twice
    corpus = [
        f"{a['title']} {a['title']} {a.get('summary', '')} {a.get('content', '')}"
        for a in articles
    ]
    
    # 2. Vectorize text corpus
    vectorizer = TfidfVectorizer(
        max_features=1500,
        stop_words="english",
        ngram_range=(1, 2)  # Looks at single words AND two-word phrases ("White House")
    )
    
    tfidf_matrix = vectorizer.fit_transform(corpus)
    feature_names = vectorizer.get_feature_names_out()
    
    # 3. Agglomerative Clustering with Cosine Distance
    # metric='cosine' measures angle between vectors regardless of article length
    clusterer = AgglomerativeClustering(
        n_clusters=None,
        distance_threshold=distance_threshold,
        metric="cosine",
        linkage="average"
    )
    
    # Convert sparse matrix to dense array as required by scikit-learn's clustering
    dense_matrix = tfidf_matrix.toarray()
    cluster_assignments = clusterer.fit_predict(dense_matrix)
    
    # 4. Group DB article IDs by assigned cluster ID
    clusters_map = {}
    for idx, cluster_num in enumerate(cluster_assignments):
        if cluster_num not in clusters_map:
            clusters_map[cluster_num] = []
        clusters_map[cluster_num].append(idx)
        
    # 5. Build final output with generated labels
    result_clusters = []
    for cluster_num, indices in clusters_map.items():
        label = generate_cluster_label(tfidf_matrix, indices, feature_names)
        article_ids = [articles[idx]["id"] for idx in indices]
        
        result_clusters.append({
            "label": label,
            "article_ids": article_ids
        })
        
    print(f"✅ Formed {len(result_clusters)} topic clusters from {len(articles)} articles!")
    return result_clusters