# cesium-server
Server for Cesium Terrain

# Use Guide

## run server
```
npm i && npm start
```

## example: open http://localhost:8000/terrain/1.html

1. Download 11thD tile zip file.
2. Unzip and save the contents to the cesium-server folder.
3. Add .env file. e.g.
    HOST_URI="http://localhost"
    LOGIN_PORT=3000
    TILESET_PORT=9890
    IAM_SERVER="http://192.168.0.120:8080"
    ISSUER_URI="http://192.168.0.120:8080/realms/eleventh"
    ACCOUNT_URI="http://192.168.0.120:8080/realms/eleventh/account"
    CLIENT_ID="unreal"
    CLIENT_SECRET="super_secured_secret"
    SESSION_SECRET="super_duper_secured_secret"
