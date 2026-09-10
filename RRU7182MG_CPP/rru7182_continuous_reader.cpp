#define _CRT_SECURE_NO_WARNINGS
#include <windows.h>
#pragma comment(lib, "User32.lib")
#include <iostream>
#include <iomanip>
#include <sstream>
#include <string>
#include <vector>

using BYTE = unsigned char;

// --- Typdefinitionen der SDK-Funktionen ---
typedef int (__stdcall *OpenComPort_t)(int port, BYTE *address, BYTE baud, int *FrmHandle);
typedef int (__stdcall *CloseSpecComPort_t)(int FrmHandle);
typedef int (__stdcall *SetAddress_t)(BYTE *address, BYTE ComAdrData, int FrmHandle);
typedef int (__stdcall *SetRegion_t)(BYTE *address, BYTE dmaxfre, BYTE dminfre, int FrmHandle);
typedef int (__stdcall *SetBaudRate_t)(BYTE *address, BYTE baud, int FrmHandle);
typedef int (__stdcall *SetInventoryScanTime_t)(BYTE *address, BYTE ScanTime, int FrmHandle);
typedef int (__stdcall *SetRfPower_t)(BYTE *address, BYTE PowerDbm, int FrmHandle);
typedef int (__stdcall *Inventory_G2_t)(
    BYTE *address,
    BYTE QValue,
    BYTE Session,
    BYTE MaskMem,
    BYTE *MaskAdr,
    BYTE MaskLen,
    BYTE *MaskData,
    BYTE MaskFlag,
    BYTE AdrTID,
    BYTE LenTID,
    BYTE TIDFlag,
    BYTE Target,
    BYTE InAnt,
    BYTE Scantime,
    BYTE FastFlag,
    BYTE *pEPCList,
    BYTE *Ant,
    int *Totallen,
    int *CardNum,
    int FrmHandle);

struct ReaderApi {
    HMODULE hDll = nullptr;
    OpenComPort_t OpenComPort = nullptr;
    CloseSpecComPort_t CloseSpecComPort = nullptr;
    SetAddress_t SetAddress = nullptr;
    SetRegion_t SetRegion = nullptr;
    SetBaudRate_t SetBaudRate = nullptr;
    SetInventoryScanTime_t SetInventoryScanTime = nullptr;
    SetRfPower_t SetRfPower = nullptr;
    Inventory_G2_t Inventory_G2 = nullptr;
};

static void printUsage(const char *prog) {
    std::cout << "Usage:\n";
    std::cout << "  " << prog << " --com 4 --power 30 --baud 6\n\n";
    std::cout << "Options:\n";
    std::cout << "  --com    COM-Port number (1..20), example: 9 -> COM9\n";
    std::cout << "  --power  Transmit power in dBm, example: 30\n";
    std::cout << "  --baud   Baud rate selector, 6 = 115200 (typical for this module)\n";
    std::cout << "  --help   Show this help\n";
}

static bool parseArgs(int argc, char **argv, int &comPort, int &powerDbm, BYTE &baud) {
    comPort = 4;
    powerDbm = 30;
    baud = 6; // 115200bps in this SDK pattern

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--help" || arg == "/?" || arg == "-h") {
            return false;
        }
        if (arg == "--com") {
            if (i + 1 >= argc) return false;
            comPort = std::stoi(argv[++i]);
        } else if (arg == "--power") {
            if (i + 1 >= argc) return false;
            powerDbm = std::stoi(argv[++i]);
        } else if (arg == "--baud") {
            if (i + 1 >= argc) return false;
            baud = static_cast<BYTE>(std::stoi(argv[++i]));
        } else {
            return false;
        }
    }
    return true;
}

static bool loadReaderLibrary(ReaderApi &api) {
    const char *dllNames[] = {
        "UHFEx10.dll",
        ".\\UHFEx10.dll",
        ".\\SDK\\VC\\x64\\UHFEx10.dll",
        ".\\SDK\\VC\\x32\\UHFEx10.dll"
    };

    for (const char *dllName : dllNames) {
        api.hDll = LoadLibraryA(dllName);
        if (api.hDll != nullptr) {
            break;
        }
    }

    if (api.hDll == nullptr) {
        std::cerr << "Fehler: UHFEx10.dll konnte nicht geladen werden.\n";
        std::cerr << "Bitte im gleichen Ordner wie das Programm oder im SDK-Pfad liegen.\n";
        return false;
    }

    api.OpenComPort = (OpenComPort_t)GetProcAddress(api.hDll, "OpenComPort");
    api.CloseSpecComPort = (CloseSpecComPort_t)GetProcAddress(api.hDll, "CloseSpecComPort");
    api.SetAddress = (SetAddress_t)GetProcAddress(api.hDll, "SetAddress");
    api.SetRegion = (SetRegion_t)GetProcAddress(api.hDll, "SetRegion");
    api.SetBaudRate = (SetBaudRate_t)GetProcAddress(api.hDll, "SetBaudRate");
    api.SetInventoryScanTime = (SetInventoryScanTime_t)GetProcAddress(api.hDll, "SetInventoryScanTime");
    api.SetRfPower = (SetRfPower_t)GetProcAddress(api.hDll, "SetRfPower");
    api.Inventory_G2 = (Inventory_G2_t)GetProcAddress(api.hDll, "Inventory_G2");

    if (!api.OpenComPort || !api.CloseSpecComPort || !api.SetAddress || !api.SetRegion || !api.SetBaudRate || !api.SetInventoryScanTime || !api.SetRfPower || !api.Inventory_G2) {
        std::cerr << "Fehler: SDK-Funktionen wurden nicht gefunden.\n";
        FreeLibrary(api.hDll);
        return false;
    }

    return true;
}

static bool configureReader(const ReaderApi &api, int comPort, BYTE baud, int &frmHandle, BYTE &comAddr, int powerDbm) {
    comAddr = 0xFF;
    frmHandle = 0;

    int ret = api.OpenComPort(comPort, &comAddr, baud, &frmHandle);
    if (ret != 0) {
        std::cerr << "OpenComPort fehlgeschlagen. Return-Code: " << ret << "\n";
        std::cerr << "Pruefe: COM-Port, Kabel, Treiber und 3.3V-TTL-Verbindung.\n";
        return false;
    }

    // Wichtig: Die Demo-Software des Herstellers setzt vor dem Lesen Adresse, Region, Baud und ScanTime.
    ret = api.SetAddress(&comAddr, 0x00, frmHandle);
    if (ret != 0) {
        std::cerr << "SetAddress fehlgeschlagen. Return-Code: " << ret << "\n";
    }

    // Die Referenz-Implementierung setzt Region mit dmaxfre=49, dminfre=128.
    ret = api.SetRegion(&comAddr, 49, 128, frmHandle);
    if (ret != 0) {
        std::cerr << "SetRegion fehlgeschlagen. Return-Code: " << ret << "\n";
    }

    ret = api.SetBaudRate(&comAddr, baud, frmHandle);
    if (ret != 0) {
        std::cerr << "SetBaudRate fehlgeschlagen. Return-Code: " << ret << "\n";
    }

    ret = api.SetInventoryScanTime(&comAddr, 0, frmHandle);
    if (ret != 0) {
        std::cerr << "SetInventoryScanTime fehlgeschlagen. Return-Code: " << ret << "\n";
    }

    ret = api.SetRfPower(&comAddr, static_cast<BYTE>(powerDbm), frmHandle);
    if (ret != 0) {
        std::cerr << "SetRfPower fehlgeschlagen. Return-Code: " << ret << "\n";
        return false;
    }

    std::cout << "Reader erfolgreich oeffnet auf COM" << comPort << "\n";
    std::cout << "Sendeleistung gesetzt auf " << static_cast<int>(powerDbm) << " dBm\n\n";
    return true;
}

static void printTagLine(const std::string &tag, int rssi) {
    std::cout << "EPC=" << tag << "  RSSI=" << rssi << "\n";
    std::cout.flush();
}

static bool isInventorySuccessCode(int ret) {
    switch (ret) {
        case 0x01:
        case 0x02:
        case 0xFB:
        case 0x26:
            return true;
        default:
            return false;
    }
}

static bool readOnce(const ReaderApi &api, BYTE comAddr, int frmHandle, std::vector<std::string> &tags) {
    BYTE epcList[4096] = {0};
    BYTE ant = 0;
    int totalLen = 0;
    int cardNum = 0;

    BYTE maskAdr[2] = {0};
    BYTE maskData[128] = {0};

    int ret = api.Inventory_G2(
        &comAddr,
        4, // QValue
        0, // Session
        0, // MaskMem
        maskAdr,
        0, // MaskLen
        maskData,
        0, // MaskFlag
        0, // AdrTID
        0, // LenTID
        0, // TIDFlag
        0, // Target
        0x80, // erste Antenne
        20, // ScanTime
        0, // FastFlag
        epcList,
        &ant,
        &totalLen,
        &cardNum,
        frmHandle);

    // Die Hersteller-SDK nutzt Erfolgs-Codes wie 0x01, 0x02, 0xFB, 0x26.
    // 0x30 bedeutet "keine Tags" bzw. kein Ergebnis.
    if (!isInventorySuccessCode(ret)) {
        if (ret == 0x30 || ret == 0xFF || ret == 0xEE || ret == 0xF8 || ret == 0xF9) {
            return false;
        }
        std::cout << "Inventory_G2 return code: 0x" << std::hex << ret << std::dec << "\n";
        return false;
    }

    if (cardNum <= 0) {
        return false;
    }

    int pos = 1;
    for (int idx = 0; idx < cardNum && pos < totalLen; ++idx) {
        if (pos >= 4095) {
            break;
        }

        int epcLen = epcList[pos - 1];
        if (epcLen <= 0 || pos + epcLen + 1 >= 4096) {
            break;
        }

        std::stringstream ss;
        for (int i = 0; i < epcLen; ++i) {
            ss << std::hex << std::setw(2) << std::setfill('0')
               << static_cast<int>(epcList[pos + i]);
        }

        int rssi = static_cast<int>(epcList[pos + epcLen]);
        tags.push_back(ss.str());
        printTagLine(ss.str(), rssi);

        pos += epcLen + 2;
    }

    return true;
}

int main(int argc, char **argv) {
    int comPort = 4;
    int powerDbm = 30;
    BYTE baud = 6;

    if (!parseArgs(argc, argv, comPort, powerDbm, baud)) {
        printUsage(argv[0]);
        std::cout << "\nInteraktive Eingabe wird gestartet.\n";
        std::cout << "COM-Port [default 4]: ";
        std::string line;
        std::getline(std::cin, line);
        if (!line.empty()) {
            try { comPort = std::stoi(line); } catch (...) { comPort = 4; }
        }
        std::cout << "Sendeleistung dBm [default 30]: ";
        std::getline(std::cin, line);
        if (!line.empty()) {
            try { powerDbm = std::stoi(line); } catch (...) { powerDbm = 30; }
        }
        std::cout << "Baudrate [default 6 = 115200]: ";
        std::getline(std::cin, line);
        if (!line.empty()) {
            try { baud = static_cast<BYTE>(std::stoi(line)); } catch (...) { baud = 6; }
        }
    }

    if (comPort < 1 || comPort > 20) {
        std::cerr << "COM-Port muss zwischen 1 und 20 liegen.\n";
        return 1;
    }
    if (powerDbm < 1 || powerDbm > 33) {
        std::cerr << "Sendeleistung muss zwischen 1 und 33 dBm liegen.\n";
        return 1;
    }

    ReaderApi api;
    if (!loadReaderLibrary(api)) {
        return 1;
    }

    BYTE comAddr = 0xFF;
    int frmHandle = 0;
    if (!configureReader(api, comPort, baud, frmHandle, comAddr, powerDbm)) {
        FreeLibrary(api.hDll);
        return 1;
    }

    std::cout << "Kontinuierliches Lesen gestartet. Zum Beenden ESC oder Ctrl+C druecken.\n\n";

    while (true) {
        std::vector<std::string> readTags;
        bool gotTag = readOnce(api, comAddr, frmHandle, readTags);

        if (!gotTag) {
            std::cout << ".";
            std::cout.flush();
        }

        if (GetAsyncKeyState(VK_ESCAPE) & 0x8000) {
            break;
        }

        Sleep(150);
    }

    api.CloseSpecComPort(frmHandle);
    FreeLibrary(api.hDll);
    std::cout << "\nProgramm beendet.\n";
    return 0;
}
