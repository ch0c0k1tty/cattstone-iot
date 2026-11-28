# Branch Conventions

## Feature Branches

All branches besides 'main' and dev branches must follow the following format:

```  <layer>/<feature-type>/<dev-name>/<feature>/<sub-feature>  ```

* **layer**: "documentation", "backend", "frontend", "middleware", "firmware"

* **feature-type**: "bug-fix", "feature", "hotfix", "optimization", "task"

* **dev-name**: only lowercase letters

* **feature**: only lowercase letters and hyphens

* **sub-feature**: only lowercase letters and hyphens

Pull requests from feature branches must be reviewed by someone other than the author of the pull request.

---

## Dev Branches

Changes made to a dev branch cannot be directly merged into 'main'. A feature branch must be created from a dev branch 
before opening a pull request from the feature branch.

---

## Fork Branches

No pull requests made from a fork of the repository will be approved.