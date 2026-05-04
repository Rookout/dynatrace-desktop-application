<p align="center">
    <a>
        <img src="./assets/dynatrace_web.png" width="400" height="120" alt="Dynatrace Logo"/>
    </a>
</p>

<h3 align="center">Dynatrace Desktop App</h3>

<p align="center">
  The Dynatrace desktop app makes it easy to view local files in your browser.
</p>

## About
[![CircleCI](https://img.shields.io/circleci/build/github/Rookout/dynatrace-desktop-application.svg?style=flat-square)](https://circleci.com/gh/Rookout/dynatrace-desktop-application)
[![GitHub release](https://img.shields.io/github/release/rookout/dynatrace-desktop-application.svg?style=flat-square)](https://GitHub.com/Rookout/dynatrace-desktop-application/releases/)
[![Github all releases](https://img.shields.io/github/downloads/rookout/dynatrace-desktop-application/total.svg?style=flat-square)](https://GitHub.com/Rookout/dynatrace-desktop-application/releases/)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg?style=flat-square)](https://GitHub.com//Rookout/dynatrace-desktop-application/graphs/commit-activity)
[![GitHub contributors](https://img.shields.io/github/contributors/rookout/dynatrace-desktop-application.svg?style=flat-square)](https://GitHub.com/Rookout/dynatrace-desktop-application/graphs/contributors/)
[![GitHub license](https://img.shields.io/github/license/rookout/dynatrace-desktop-application.svg?style=flat-square)](https://github.com/Rookout/dynatrace-desktop-application/blob/master/LICENSE)
[![Known Vulnerabilities](https://snyk.io/test/github/rookout/dynatrace-desktop-application/badge.svg?style=flat-square)](https://snyk.io/test/github/rookout/dynatrace-desktop-application)


The Dynatrace desktop app (previously known as "Explorook" or "Rookout desktop app") allows you to navigate through your local projects in a simple and flexible manner. Use this app in combination with the Dynatrace Live Debugger app to set non-breaking breakpoints in your source files, and to instantly apply them to live code. 



- Ease of use - set up once and easily access any directory or file you choose directly from the browser. No need to manually open or refresh files and folders; no additional privileges needed.
- Git aware - seamlessly access your source code across all devices where the app is installed, regardless of the local paths to which you’ve cloned a git repository to. Easily collaborate with fellow developers working on the same code base. 
- Security - maintain strict control over the files you open for sharing and the websites that can access them. Dynatrace will never collect or modify your source code. 

## Security

At Dynatrace we take your source code security very seriously. Dynatrace will never collect or modify your source code. 

The Dynatrace Desktop App was designed with security as a foremost concern, its security features are as follows:
- The App only listens for connections from localhost and disallows any other `host` header.
- The App only allows access from the Live Debugger app on Dynatrace.

## Installation

The desktop app can be installed from within the Dynatrace Live Debugger web UI, by choosing the "Local Filesystem" option when fetching source code. A link is offered to download the app (which will be customized to your operating system, and which will offer the latest available installer).

## Contributing

There are many ways in which you can participate in the project, for example:
- [Submit bugs and feature requests](https://github.com/Rookout/dynatrace-desktop-application/issues), and help us verify as they are checked in.

If you are interested in fixing issues and contributing directly to the code base, feel free to [open a pull request](https://github.com/Rookout/dynatrace-desktop-application/pulls).

## Feedback
- [Request a new feature](https://github.com/Rookout/dynatrace-desktop-application/issues)
- [File an issue](https://github.com/Rookout/dynatrace-desktop-application/issues)


## Requirements
### Node.js
This project supports Node.js version 18 and above. Ensure that you have Node.js v18.19.30 or later installed on your system to use this project effectively.
### Operating System
While this project is designed to run on various operating systems, it does not support Windows 7 or Windows 8. We recommend using Windows 10/11, macOS, or a Linux distribution for optimal compatibility and performance.


## License

Copyright (c) Dynatrace LLC. All rights reserved. 

Licensed under the Apache 2.0 license.

