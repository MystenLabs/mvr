module package_info::github {

    use std::string::String;

    public struct GithubInfo has copy, store, drop {
        // The repository that our code's open source at
        repository: String,
        // The sub-path inside the repository
        path: String,
        // the tag or commit hash for the current version
        tag: String
    }

    public fun new(repository: String, path: String, tag: String): GithubInfo {
        GithubInfo {
            repository,
            path,
            tag
        }
    }
}
