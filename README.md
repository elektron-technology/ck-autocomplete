# ck-autocomplete

Angular autocomplete component. Used in various components in WebUI and HubUI.

This repository has to be public to be consumed from bower.

[Version](#version) | [Installation](#installation) | [Environment](#environment) | [Dependent services](#dependent-services) | [Debugging](#debugging) | [Testing](#testing) | [Deployment](#deployment) | [Monitoring](#monitoring)

## Version

2.0.1

## Installation

```console
yarn install https://github.com/elektron-technology/ck-autocomplete.git#^2.0.1
```

## Environment

- node.js 10 for running tests

It is not possible to run this code in isolation, it has to be consumed by an angular project.

## Dependent services

- [Checkit Hub UI](https://github.com/elektron-technology/checkit-hub-ui)
- [Checkit Web UI](https://github.com/elektron-technology/checkit-web-ui)

## Debugging

Debug through browser running consuming service.

## Testing

### Unit tests

`gulp test`

## Deployment

Built as a bower project and deployed as part of the consuming service.

1. Run `gulp` to generate new distribution code
2. Bump version accordingly
3. Raise a PR with the changes and distribution code
4. Once PR is merged, create a github release with the new version

## Monitoring

This is an external component and is monitored as part of the consuming service.
