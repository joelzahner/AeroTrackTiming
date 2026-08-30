// 下列 ifdef 块是创建使从 DLL 导出更简单的
// 宏的标准方法。此 DLL 中的所有文件都是用命令行上定义的 UHFEx10_EXPORTS
// 符号编译的。在使用此 DLL 的
// 任何其他项目上不应定义此符号。这样，源文件中包含此文件的任何其他项目都会将
// UHFEx10_API 函数视为是从 DLL 导入的，而此 DLL 则将用此宏定义的
// 符号视为是被导出的。
#ifdef UHFEx10_EXPORTS
#define UHFEx10_API __declspec(dllexport)
#else
#define UHFEx10_API __declspec(dllimport)
#endif

// 此类是从 UHFEx10.dll 导出的
class UHFEx10_API CUHFEx10 {
public:
	CUHFEx10(void);
	// TODO: 在此添加您的方法。
};

#include "Reader.h"

#ifdef __cplusplus
extern "C" {
#endif
	UHFEx10_API void InitRFIDCallBack(pRFIDCallBack pUIDback,BOOL isBackUID,int FrmHandle);
	UHFEx10_API int CloseNetPort(int FrmHandle);
	UHFEx10_API int OpenNetPort(int Port,
		LPCTSTR IPaddr,
		BYTE*ComAdr,
		int *Frmhandle);
	UHFEx10_API int OpenUSBPort(BYTE *address,int* FrmHandle);
	UHFEx10_API int CloseUSBPort(int FrmHandle);
	UHFEx10_API int CloseComPort();

	UHFEx10_API int CloseSpecComPort(int FrmHandle);

	UHFEx10_API int GetReaderInformation(BYTE* ComAdr,				//读写器地址		
		BYTE* VersionInfo,			//软件版本
		BYTE* ReaderType,				//读写器型号
		BYTE* TrType,		//支持的协议
		BYTE* dmaxfre,           //当前读写器使用的最高频率
		BYTE* dminfre,           //当前读写器使用的最低频率
		BYTE* powerdBm,             //读写器的输出功率
		BYTE* ScanTime,
		BYTE*Ant,
		BYTE*BeepEn,
		BYTE*OutputRep,
		BYTE*CheckAnt,
		int FrmHandle);//最大询查时间

	UHFEx10_API int OpenComPort(int port,
		BYTE *address,
		BYTE baud,
		int* FrmHandle);

	UHFEx10_API int AutoOpenComPort(int *port,
		BYTE *address,
		BYTE baud,
		int *FrmHandle);

	UHFEx10_API int Inventory_G2(BYTE *address,
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


	UHFEx10_API int Fast_EPC_Inventory_G2(BYTE *address,
		BYTE QValue,
		BYTE Session,
		BYTE Target,
		BYTE ScanTime,
		BYTE *Ant,
		BYTE *pEPCList, 
		int *Totallen,		
		int *CardNum,
		int FrmHandle);
	UHFEx10_API int InventoryMix_G2(BYTE *address,
		BYTE QValue,
		BYTE Session,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		BYTE MaskFlag,
		BYTE ReadMem,
		BYTE *ReadAdr,
		BYTE ReadLen,
		BYTE *Psd,
		BYTE Target,
		BYTE InAnt,
		BYTE Scantime,
		BYTE FastFlag,///////////////
		BYTE *pEPCList,
		BYTE *Ant,
		int *Totallen,		
		int *CardNum,
		int FrmHandle);

	UHFEx10_API int InventoryExtMix_G2(unsigned char *address,
		unsigned char QValue,
		unsigned char Session,
		unsigned char ParamCount,
		unsigned char *param,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char MaskFlag,
		unsigned char *Psd,
		unsigned char Target,
		unsigned char InAnt,
		unsigned char Scantime,
		unsigned char FastFlag,///////////////
		unsigned char *pEPCList,
		unsigned char *Ant,
		int *Totallen,		
		int *CardNum,
		int FrmHandle);



	UHFEx10_API int Inventory_EPC_G2(BYTE *address,
		BYTE MatchType,
		BYTE *MatchLen,
		BYTE *MatchOffset,
		BYTE *EPCData,///////////////
		BYTE *pEPCList,
		BYTE *Ant,
		int *Totallen,		
		int *CardNum,
		int FrmHandle)	;

	UHFEx10_API int Inventory_QT_G2(BYTE *address,
		BYTE QValue,
		BYTE Session,
		BYTE Target,
		BYTE InAnt,///////////////
		BYTE Scantime,
		BYTE FastFlag,
		BYTE *pEPCList,
		BYTE *Ant,
		int *Totallen,		
		int *CardNum,
		int FrmHandle);

	UHFEx10_API int ReadData_G2(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE Mem,
		BYTE WordPtr,
		BYTE Num,
		BYTE *Password,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		BYTE *Data,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int WriteData_G2(BYTE *address,
		BYTE *EPC,
		BYTE WNum,
		BYTE ENum,
		BYTE Mem,
		BYTE WordPtr,
		BYTE *Wdt,
		BYTE *Password,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int WriteEPC_G2(BYTE *address,						       
		BYTE *Password,
		BYTE *WriteEPC,
		BYTE ENum,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int KillTag_G2(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE *Killpwd,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int Lock_G2(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE select,
		BYTE setprotect,
		BYTE *Password,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int BlockErase_G2(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE Mem,
		BYTE WordPtr,
		BYTE Num,
		BYTE *Password,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int SetPrivacyByEPC_G2(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE *Password,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int SetPrivacyWithoutEPC_G2(BYTE *address,
		BYTE *Password,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int ResetPrivacy_G2(BYTE *address,
		BYTE *Password,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int CheckPrivacy_G2(BYTE *address,
		BYTE *readpro,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int EASConfigure_G2(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE *Password,
		BYTE EAS,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int EASAlarm_G2(BYTE *address,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int BlockLock_G2(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE *Password,
		BYTE WrdPointer,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int SingleTagInventory_G2(BYTE *address,
		BYTE* EPC,
		int *EPCLength,		
		int *CardNum,
		int FrmHandle);

	UHFEx10_API int BlockWrite_G2(BYTE *address,
		BYTE *EPC,
		BYTE WNum,
		BYTE ENum,
		BYTE Mem,
		BYTE WordPtr,
		BYTE *Wdt,
		BYTE *Password,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int InventorySingle_6B(BYTE *address,
		BYTE *Ant,
		BYTE* ID_6B,
		int FrmHandle);

	UHFEx10_API int InventoryMultiple_6B(BYTE *address,
		BYTE Condition,
		BYTE StartAddress,
		BYTE mask,
		BYTE *ConditionContent,
		BYTE *Ant,
		BYTE* ID_6B,
		int *Cardnum,
		int FrmHandle);

	UHFEx10_API int ReadData_6B(BYTE *address,
		BYTE* ID_6B,
		BYTE StartAddress,
		BYTE Num,
		BYTE *Data,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int WriteData_6B(BYTE *address,
		BYTE *ID_6B,
		BYTE StartAddress,
		BYTE *Writedata,
		BYTE Writedatalen,
		BYTE *writtenbyte,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int Lock_6B(BYTE *address,
		BYTE *ID_6B,
		BYTE StartAddress,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int CheckLock_6B(BYTE *address,
		BYTE *ID_6B,
		BYTE StartAddress,
		BYTE *ReLockState,
		int *Errorcode,
		int FrmHandle)	;

	UHFEx10_API int SetRegion(BYTE *address,
		BYTE dmaxfre,
		BYTE dminfre,
		int FrmHandle);

	UHFEx10_API int SetAddress(BYTE *address,
		BYTE ComAdrData,
		int FrmHandle);

	UHFEx10_API int SetInventoryScanTime(BYTE *address,
		BYTE ScanTime,
		int FrmHandle);

	UHFEx10_API int InSelfTestMode(BYTE *address,
		BOOL IsSelfTestMode,
		int FrmHandle);

	UHFEx10_API int SetBaudRate(BYTE *address,
		BYTE baud,
		int FrmHandle);

	UHFEx10_API int SetDAC(BYTE *address,
		BYTE DACdata,
		int FrmHandle);

	UHFEx10_API int GetDAC(BYTE *address,
		BYTE *DACdata,
		int FrmHandle);

	UHFEx10_API int CheckPowerParameter(BYTE *address,
		BYTE *code,
		int FrmHandle);

	UHFEx10_API int SolidifyDACandPowerlist(BYTE *address,
		BYTE *dBm_list,
		BYTE *code,
		int FrmHandle);

	UHFEx10_API int GetStartInformation(BYTE *address,
		BYTE *FreE,
		BYTE *addrE,
		BYTE *scnE,
		BYTE *xpwrE,
		BYTE *wgE,
		BYTE *xRreadModeE,
		BYTE *xModeParaE,
		BYTE *xbpsE,
		BYTE *xEasAccuE,
		int FrmHandle);

	UHFEx10_API int SetRfPower(BYTE *address,
		BYTE PowerDbm,
		int FrmHandle);

	UHFEx10_API int RfOutput(BYTE *address,
		BYTE OnOff,
		int FrmHandle);

	UHFEx10_API int DeleteRfOutput(BYTE *address,
		BYTE *Reinfo,
		int FrmHandle);

	UHFEx10_API int BuzzerAndLEDControl(BYTE *address,
		BYTE AvtiveTime,
		BYTE SilentTime,
		BYTE Times,
		int FrmHandle);

	UHFEx10_API int SetWorkMode(BYTE *address,
		BYTE Read_mode,
		int FrmHandle);

	UHFEx10_API int GetSystemParameter(BYTE *address,
		BYTE *Read_mode,
		BYTE *Accuracy,
		BYTE *RepCondition,
		BYTE *RepPauseTime,
		BYTE *ReadPauseTim,
		BYTE *TagProtocol,
		BYTE *MaskMem,
		BYTE *MaskAdr,
		BYTE *MaskLen,
		BYTE *MaskData,
		BYTE *TriggerTime,
		BYTE *AdrTID,
		BYTE *LenTID,
		int FrmHandle);

	UHFEx10_API int SetEASSensitivity(BYTE *ComAdr,
		BYTE Accuracy,
		int FrmHandle);

	UHFEx10_API int SetTriggerTime(BYTE *ComAdr,
		BYTE TriggerTime,
		int FrmHandle);

	UHFEx10_API int SetMask(BYTE *ComAdr,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		int FrmHandle);

	UHFEx10_API int SetResponsePamametersofAuto_runningMode(BYTE *ComAdr,
		BYTE RepCondition,
		BYTE RepPauseTime,
		int FrmHandle);

	UHFEx10_API int SetInventoryInterval(BYTE *ComAdr,
		BYTE ReadPauseTim,
		int FrmHandle);

	UHFEx10_API int SelectTagType(BYTE *ComAdr,
		BYTE TagProtocol,
		int FrmHandle);

	UHFEx10_API int SetAntennaMultiplexing(BYTE *ComAdr,
		BYTE Ant,
		int FrmHandle);

	UHFEx10_API int SetBeepNotification(BYTE *ComAdr,
		BYTE BeepEn,
		int FrmHandle);

	UHFEx10_API int SetReal_timeClock(BYTE *ComAdr,
		BYTE *paramer,
		int FrmHandle);

	UHFEx10_API int GetTime(BYTE *ComAdr,
		BYTE *paramer,
		int FrmHandle);

	UHFEx10_API int GetTagBufferInfo(BYTE *ComAdr,
		BYTE *Data,
		int *dataLength,
		int FrmHandle);

	UHFEx10_API int ClearTagBuffer(BYTE *ComAdr,
		int FrmHandle);

	UHFEx10_API int SetRelay(BYTE *ComAdr,
		BYTE RelayTime,
		int FrmHandle);

	UHFEx10_API int SetRevDelay(BYTE *ComAdr,
		BYTE RevDelay,
		int FrmHandle);

	UHFEx10_API int GetRevDelay(BYTE *ComAdr,
		BYTE *RevDelay,
		int FrmHandle);

	UHFEx10_API int GetGPIOStatus(BYTE *ComAdr,
		BYTE *OutputPin,
		int FrmHandle);

	UHFEx10_API int SetGPIO(BYTE *ComAdr,
		BYTE OutputPin,
		int FrmHandle);

	UHFEx10_API int SetNotificationPulseOutput(BYTE *ComAdr,
		BYTE OutputRep,
		int FrmHandle);

	UHFEx10_API int ReadActiveModeData(BYTE * ScanModeData,
		int *ValidDatalength,
		int FrmHandle);

	UHFEx10_API int SetTIDParameter(BYTE *address,
		BYTE AdrTID,
		BYTE LenTID,
		int FrmHandle);

	UHFEx10_API int ChangeATMode(BYTE *address,
		BYTE ATMode,
		int FrmHandle);

	UHFEx10_API int TransparentCMD(BYTE *ComAdr,
		BYTE timeout,
		BYTE nlen,
		BYTE *cmddata,
		BYTE *recvLen,
		BYTE *recvdata,
		int FrmHandle);

	UHFEx10_API int SetSeriaNo(BYTE *address,
		BYTE* SeriaNo,
		int FrmHandle);

	UHFEx10_API int GetSeriaNo(BYTE *address,
		BYTE* SeriaNo,
		int FrmHandle);

	UHFEx10_API int EnableTestFreq(BYTE *address,
		BYTE* TestFreq,
		BYTE GainIndex,
		int FrmHandle);

	UHFEx10_API int GetADValue(BYTE *address,
		BYTE nFlag,
		BYTE* ADValue,
		int FrmHandle);

	UHFEx10_API int SetAValue(BYTE *address,
		BYTE nFlag,
		BYTE* A1,
		BYTE* A0,
		int FrmHandle);

	UHFEx10_API int AutoTable(BYTE *address,
		int FrmHandle);

	UHFEx10_API int AutoOffset(BYTE *address,
		int FrmHandle);

	UHFEx10_API int GetAdjustPara(BYTE *address,
		BYTE *data,
		int FrmHandle);

	UHFEx10_API int SetCheckAnt(BYTE *address,
		BYTE CheckAnt,
		int FrmHandle);

	UHFEx10_API int GetCheckPWR(BYTE *address,
		BYTE *FWDPWR,
		BYTE *REVPWR,
		int FrmHandle);


	UHFEx10_API int SetTagCustomFunction(BYTE *address,
		BYTE *InlayType,
		int FrmHandle);

	UHFEx10_API int GetMonza4QTWorkParamter_G2(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE *Password,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		BYTE *QTcontrol,
		int *Errorcode,
		int FrmHandle)	;

	UHFEx10_API int SetMonza4QTWorkParamter_G2(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE QTcontrol,
		BYTE *Password,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		int *Errorcode,
		int FrmHandle);


	UHFEx10_API int SetCommType(BYTE *address,
		BYTE CommType,
		int FrmHandle);

	UHFEx10_API int SetDCOffset(BYTE *address,
		BYTE* DCOffset,
		int FrmHandle);

	UHFEx10_API int SetQS(BYTE *address,
		BYTE Qvalue,
		BYTE Session,
		int FrmHandle);

	UHFEx10_API int GetQS(BYTE *address,
		BYTE *Qvalue,
		BYTE *Session,
		int FrmHandle);

	UHFEx10_API int GetModuleVersion(BYTE *address,
		BYTE *Version,
		int FrmHandle);
	UHFEx10_API int SetFlashRom(BYTE *address,
		int FrmHandle);

	UHFEx10_API int ExtReadData_G2(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE Mem,
		BYTE *WordPtr,
		BYTE Num,
		BYTE *Password,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		BYTE *Data,
		int *Errorcode,
		int FrmHandle)	;

	UHFEx10_API int ExtWriteData_G2(BYTE *address,
		BYTE *EPC,
		BYTE WNum,
		BYTE ENum,
		BYTE Mem,
		BYTE *WordPtr,
		BYTE *Wdt,
		BYTE *Password,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int InventoryBuffer_G2(BYTE *address,
		BYTE QValue,
		BYTE Session,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		BYTE MaskFlag,
		BYTE AdrTID,
		BYTE LenTID,
		BYTE TIDFlag,///////////
		BYTE Target,
		BYTE InAnt,
		BYTE Scantime,
		BYTE FastFlag,///////////////
		int *BufferCount,		
		int *TagNum,
		int FrmHandle);

	UHFEx10_API int SetSaveLen(BYTE *ComAdr,
		BYTE SaveLen,
		int FrmHandle);
	UHFEx10_API int GetSaveLen(BYTE *ComAdr,
		BYTE *SaveLen,
		int FrmHandle);
	UHFEx10_API int ReadBuffer_G2(BYTE *ComAdr,
		int *Totallen,
		int *CardNum,
		BYTE *pEPCList,
		int FrmHandle);
	UHFEx10_API int ClearBuffer_G2(BYTE *ComAdr,
		int FrmHandle);
	UHFEx10_API int GetBufferCnt_G2(BYTE *ComAdr,
		int *Count,
		int FrmHandle);
	UHFEx10_API int SetReadMode(BYTE *ComAdr,
		BYTE ReadMode	,
		int FrmHandle);
	UHFEx10_API int SetReadParameter(BYTE *ComAdr,
		BYTE *Parameter,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		BYTE MaskFlag,
		BYTE AdrTID,
		BYTE LenTID,
		BYTE TIDFlag,///////////
		int FrmHandle);
	UHFEx10_API int GetReadParameter(BYTE *ComAdr,
		BYTE *Parameter,
		int FrmHandle);
	UHFEx10_API int WriteRfPower(BYTE *address,
		BYTE PowerDbm,
		int FrmHandle);

	UHFEx10_API int ReadRfPower(BYTE *address,
		BYTE *PowerDbm,
		int FrmHandle);

	UHFEx10_API int RetryTimes(BYTE *address,
		BYTE *Times,
		int FrmHandle);



	UHFEx10_API int GetTMP_G2(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE WordPtr,
		BYTE WaitTime,
		BYTE *Data,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int ConfigAntNum(BYTE *address,
		BYTE *AntNum,
		int FrmHandle);

	UHFEx10_API int SetUserPwd(BYTE *address,
		BYTE *UserPwd,
		int FrmHandle);

	UHFEx10_API int GetUserPwd(BYTE *address,
		BYTE *UserPwd,
		int FrmHandle);//
	UHFEx10_API int SetUTCTime(BYTE *address,
		BYTE *UTCTime,
		int FrmHandle);
	UHFEx10_API int GetEMTmpData(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE SendUID,
		BYTE NewSample,
		BYTE *Password,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		BYTE *UID,
		BYTE *SenserData,
		BYTE *UTC,
		int *Errorcode,
		int FrmHandle);
	UHFEx10_API int GetSPI(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE SPICmdSize,
		BYTE SPIResSize,
		BYTE SPISclk,
		BYTE SPIInitDelay,
		BYTE SPIInterval,
		BYTE* SPICmd,
		BYTE *Password,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		BYTE *SPIResData,
		int *Errorcode,
		int FrmHandle);
	UHFEx10_API int ResetAlarm(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE *Password,
		BYTE MaskMem,
		BYTE *MaskAdr,
		BYTE MaskLen,
		BYTE *MaskData,
		int *Errorcode,
		int FrmHandle);
	UHFEx10_API int SetCarrierTime(BYTE *address,
		BYTE *CarrierTime,
		int FrmHandle);
	UHFEx10_API int SecondIdentify(BYTE *address,
		BYTE *Token1,
		BYTE *Token2,
		BYTE *Handle,
		int FrmHandle);
	UHFEx10_API int FirstIdentify(BYTE *address,
		BYTE *RT,
		int FrmHandle);
	UHFEx10_API int QueryAndIdentify(BYTE *address,
		BYTE *EPC,
		BYTE ENum,
		BYTE *EPCLen,
		BYTE *NewEPC,
		BYTE *RSSI,
		BYTE *KI,
		BYTE *TID,
		int FrmHandle);
	UHFEx10_API int SetHeartBeatTime(BYTE *address,
		BYTE *HeartBeatTime,
		int FrmHandle);
	UHFEx10_API int SetFTime(BYTE *address,
		BYTE FTime,
		int FrmHandle);
	UHFEx10_API int GetFTime(BYTE *address,
		BYTE* FTime,
		int FrmHandle);
	UHFEx10_API int SetDRM(BYTE *address,
		BYTE DRM,
		int FrmHandle);
	UHFEx10_API int GetDRM(BYTE *address,
		BYTE* DRM,
		int FrmHandle);

	UHFEx10_API int SetAntennaA12(BYTE *ComAdr,
		BYTE SetOnce,
		BYTE AntCfg1,
		BYTE AntCfg2,
		int FrmHandle);

	UHFEx10_API int OptAntenna(unsigned char *ComAdr,
									   unsigned char opt,
									   unsigned char SetOnce,
									   unsigned char *AntCfg,int FrmHandle);

	UHFEx10_API int GetReaderTemperature(BYTE *address,
		BYTE* PlusMinus,
		BYTE* Temperature,
		int FrmHandle);

	UHFEx10_API int MeasureReturnLoss(BYTE *address,
		BYTE* TestFreq,
		BYTE Ant,
		BYTE*ReturnLoss,
		int FrmHandle);
	
	UHFEx10_API int StopImmediately(BYTE *address,int FrmHandle);

	UHFEx10_API int Untraceable_G2(unsigned char *address,
										unsigned char *EPC,
										unsigned char ENum,
										unsigned char UFlag,
										unsigned char EPCHide,
										unsigned char NewEPCLen,
										unsigned char TIDHide,
										unsigned char UserHide,
										unsigned char Range,
										unsigned char *Password,
										unsigned char MaskMem,
										unsigned char *MaskAdr,
										unsigned char MaskLen,
										unsigned char *MaskData,
										int *Errorcode,
										int FrmHandle);
	UHFEx10_API int SetRfPowerByAnt(unsigned char *address,unsigned char* PowerDbm,int FrmHandle);
	UHFEx10_API int GetRfPowerByAnt(unsigned char *address,unsigned char* PowerDbm,int FrmHandle);
	UHFEx10_API int Inventory_FastBID_NXP(unsigned char *address,
								unsigned char QValue,
								unsigned char Session,
								unsigned char Target,
								unsigned char InAnt,
								unsigned char Scantime,
								unsigned char FastFlag,
								unsigned char *pEPCList,
								unsigned char *Ant,
								int *Totallen,		
								int *CardNum,int FrmHandle);

	UHFEx10_API int Inventory_FastTID_NXP(unsigned char *address,
								unsigned char QValue,
								unsigned char Session,
								unsigned char Target,
								unsigned char InAnt,
								unsigned char Scantime,
								unsigned char FastFlag,
								unsigned char *pEPCList,
								unsigned char *Ant,
								int *Totallen,		
								int *CardNum,int FrmHandle);
	UHFEx10_API int SetPowerMode(unsigned char *address,
		unsigned char* PowerMode,int FrmHandle);
	UHFEx10_API int SetFilterTime(unsigned char *address,
		unsigned char FilterTime,int FrmHandle);
	UHFEx10_API int GetFilterTime(unsigned char *address,
		unsigned char* FilterTime,int FrmHandle);

	UHFEx10_API int GetTagTemperature(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char WordPtr,
		unsigned char WaitTime,
		unsigned char ReadWordPtr,
		unsigned char ReadWordCnt,
		unsigned char ReadWordFlag,
		unsigned char *Data,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int GetTagTemperatureByTime(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char WordPtr,
		unsigned char WaitTime,
		unsigned char* tTime,
		unsigned char ReadWordPtr,
		unsigned char ReadWordCnt,
		unsigned char ReadWordFlag,
		unsigned char *Data,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int Inventory_Temperature(unsigned char *address,
		unsigned char ENum,
		unsigned char *EPC,
		unsigned char SelTarget,
		unsigned char SelAction,
		unsigned char WaitTime,
		unsigned char QValue,
		unsigned char Session,
		unsigned char Target,
		unsigned char inAnt,
		unsigned char Scantime,
		unsigned char *pEPCList,
		unsigned char *Ant,
		int *Totallen,		
		int *CardNum,
		int FrmHandle);

	UHFEx10_API int Inventory_Temperature_ltu32(unsigned char *address,
		unsigned char ENum,
		unsigned char *EPC,
		unsigned char SelTarget,
		unsigned char SelAction,
		unsigned char WaitTime,
		unsigned char QValue,
		unsigned char Session,
		unsigned char Target,
		unsigned char inAnt,
		unsigned char Scantime,
		unsigned char *pEPCList,
		unsigned char *Ant,
		int *Totallen,		
		int *CardNum,
		int FrmHandle);

	UHFEx10_API int Inventory_Temperature_Ast010(unsigned char *address,
		unsigned char QValue,
		unsigned char Session,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char MaskFlag,
		unsigned char Target,
		unsigned char InAnt,
		unsigned char Scantime,
		unsigned char FastFlag,
		unsigned char *pEPCList,
		unsigned char *Ant,
		int *Totallen,		
		int *CardNum,int FrmHandle);


	UHFEx10_API int Inventory_GB(unsigned char *address,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char MaskFlag,
		unsigned char InAnt,
		unsigned char Scantime,
		unsigned char FastFlag,
		unsigned char *pEPCList,
		unsigned char *Ant,
		int *Totallen,		
		int *CardNum,
		int FrmHandle);

	UHFEx10_API int InventoryMix_GB(unsigned char *address,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char MaskFlag,
		unsigned char ReadMem,
		unsigned char *ReadAdr,
		unsigned char ReadLen,
		unsigned char *Psd,
		unsigned char InAnt,
		unsigned char Scantime,
		unsigned char FastFlag,///////////////
		unsigned char *pEPCList,
		unsigned char *Ant,
		int *Totallen,		
		int *CardNum,
		int FrmHandle);

	UHFEx10_API int ReadData_GB(unsigned char *address,
		unsigned char *TagID,
		unsigned char TNum,
		unsigned char ReadMem,
		unsigned char *WordPtr,
		unsigned char WordNum,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char *Data,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int WriteData_GB(unsigned char *address,
		unsigned char *TagID,
		unsigned char WNum,
		unsigned char TNum,
		unsigned char WMem,
		unsigned char *WordPtr,
		unsigned char *Wdt,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int BlockErase_GB(unsigned char *address,
		unsigned char *EPC,
		unsigned char TNum,
		unsigned char EMem,
		unsigned char *WordPtr,
		unsigned char *ENum,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int Lock_GB(unsigned char *address,
		unsigned char *TagID,
		unsigned char TNum,
		unsigned char LockMem,
		unsigned char Cfg,
		unsigned char Action,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int KillTag_GB(unsigned char *address,
		unsigned char *TagID,
		unsigned char TNum,
		unsigned char *Killpwd,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int Inventory_JB(unsigned char *address,
		unsigned char Algo,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char MaskFlag,
		unsigned char InAnt,
		unsigned char Scantime,
		unsigned char FastFlag,
		unsigned char *pEPCList,
		unsigned char *Ant,
		int *Totallen,		
		int *CardNum,
		int FrmHandle);

	UHFEx10_API int InventoryMix_JB(unsigned char *address,
		unsigned char Algo,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char MaskFlag,
		unsigned char ReadMem,
		unsigned char *ReadAdr,
		unsigned char ReadLen,
		unsigned char *Psd,
		unsigned char InAnt,
		unsigned char Scantime,
		unsigned char FastFlag,///////////////
		unsigned char *pEPCList,
		unsigned char *Ant,
		int *Totallen,		
		int *CardNum,
		int FrmHandle);

	UHFEx10_API int ReadData_JB(unsigned char *address,
		unsigned char *TagID,
		unsigned char TNum,
		unsigned char ReadMem,
		unsigned char *WordPtr,
		unsigned char WordNum,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char *Data,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int WriteData_JB(unsigned char *address,
		unsigned char *TagID,
		unsigned char WNum,
		unsigned char TNum,
		unsigned char WMem,
		unsigned char *WordPtr,
		unsigned char *Wdt,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int BlockErase_JB(unsigned char *address,
		unsigned char *EPC,
		unsigned char TNum,
		unsigned char EMem,
		unsigned char *WordPtr,
		unsigned char *ENum,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int Lock_JB(unsigned char *address,
		unsigned char *TagID,
		unsigned char TNum,
		unsigned char LockMem,
		unsigned char Cfg,
		unsigned char Action,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int KillTag_JB(unsigned char *address,
		unsigned char *TagID,
		unsigned char TNum,
		unsigned char *Killpwd,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,
		int FrmHandle);

	UHFEx10_API int SelectCMD(unsigned char *address,
			  unsigned char ant,
			  unsigned char Session,
			  unsigned char Selaction,
			  unsigned char MaskMem,
			  unsigned char *MaskAdr,
			  unsigned char MaskLen,
			  unsigned char *MaskData,
			  unsigned char Truncate,
			  int FrmHandle);
	UHFEx10_API int RelayControll(unsigned char *address,
		unsigned char* RelayTime,int FrmHandle);

	UHFEx10_API int Fd_InitRegfile(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int Fd_ReadReg(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char *RegAddr,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char *Data,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int Fd_WriteReg(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char *RegAddr,
		unsigned char *RegData,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int Fd_ReadMemory(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char *StartAddr,
		unsigned char ReadLen,
		unsigned char *Password,
		unsigned char AuthType,
		unsigned char *AuthPwd,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char *Data,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int Fd_ExtReadMemory(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char *StartAddr,
		unsigned char *ReadLen,
		unsigned char *Password,
		unsigned char AuthType,
		unsigned char *AuthPwd,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char *Data,
		int *RecvLen,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int Fd_WriteMemory(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char *StartAddr,
		unsigned char WriteLen,
		unsigned char *WriteData,
		unsigned char *Password,
		unsigned char AuthType,
		unsigned char *AuthPwd,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int Fd_GetTemperature(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char MeaType,
		unsigned char ResultSel,
		unsigned char FieldChkEn,
		unsigned char EPStorageEn,
		unsigned char UserBlockAddr,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char *Temp,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int Fd_StartLogging(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char* StartDelay,
		unsigned char* VdetStep,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int Fd_StopLogging(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char *Password,
		unsigned char *StopPwd,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int Fd_OP_Mode_Chk(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char RefreshCfg,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char *ModeStatus,
		int *Errorcode,int FrmHandle);


	UHFEx10_API int Fd_LedCtr(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char LedCtrl,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int Fd_DeepSleep(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int SelectCmdWithCarrier(unsigned char *address,
		unsigned char ant,
		unsigned char Session,
		unsigned char Selaction,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char Truncate,
		unsigned char CarrierTime,int FrmHandle);
	UHFEx10_API int CheckSense(unsigned char* sense);
	UHFEx10_API float GetTemperature(unsigned char* sense,unsigned char* adj);
	UHFEx10_API int SetProfile(unsigned char *address,
		unsigned char *Profile,int FrmHandle);

	UHFEx10_API int SetReaderPwd(unsigned char *ComAdr,
		unsigned char *Password,int FrmHandle);

	UHFEx10_API int GetReaderPwd(unsigned char *ComAdr,
		unsigned char *Password,int FrmHandle);

	UHFEx10_API int GetBxTagTemperature(unsigned char *ComAdr,
		unsigned char ENum, 
		unsigned char *EPC, 
		unsigned char *TempData,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int YL_GetTempData(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char *Data,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int YL_LED_Controll(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char Mode,
		unsigned char CarrTime,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int ON_GetTempData(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char *Data,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int Fast_switch_ant_inventory(unsigned char *address,unsigned char AntA,unsigned char StayA,
		unsigned char AntB,unsigned char StayB,
		unsigned char AntC,unsigned char StayC,
		unsigned char AntD,unsigned char StayD,
		unsigned char Interval,
		unsigned char Repeat,int FrmHandle);

	UHFEx10_API int KLW_LED_Controll(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char CarrTime,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int BX_LED_Controll(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char CarrTime,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int SwitchProtocol(unsigned char *address,
		unsigned char *protocol,int FrmHandle);

	UHFEx10_API int ExtBlockWrite_G2(unsigned char *address,
		unsigned char *EPC,
		unsigned char WNum,
		unsigned char ENum,
		unsigned char Mem,
		unsigned char *WordPtr,
		unsigned char *Wdt,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int SetAntenna(unsigned char *ComAdr,
		unsigned char SetOnce,
		unsigned char AntCfg1,
		unsigned char AntCfg2,
		int FrmHandle);
	UHFEx10_API int SetAntennaPower(unsigned char *address,
		unsigned char* PowerDbm,int length,int FrmHandle);

	UHFEx10_API int GetAntennaPower(unsigned char *address,
		unsigned char* PowerDbm,int* length,int FrmHandle);

	UHFEx10_API int SetDwellTime(unsigned char *address,unsigned char flag,unsigned char FCCOnTime,unsigned char S1Times,int FrmHandle);

	UHFEx10_API int GetDwellTime(unsigned char *address,unsigned char *FCCOnTime,unsigned char *S1Times,int FrmHandle);

	UHFEx10_API int SetCfgParameter(unsigned char *address,unsigned char opt,unsigned char cfgNo,unsigned char *cfgData,int len,int FrmHandle);
	UHFEx10_API int GetCfgParameter(unsigned char *address,unsigned char cfgNo,unsigned char *cfgData,int *len,int FrmHandle);
	UHFEx10_API int StartRead(unsigned char *address,unsigned char target,int FrmHandle);
	UHFEx10_API int StopRead(unsigned char *address,int FrmHandle);
	UHFEx10_API int GetRfidTagData(unsigned char *address,unsigned char *data,int* length,int FrmHandle);
	UHFEx10_API int SelectCMDByAntenna(unsigned char *address,
			  int Antenna,unsigned char portNum,
			  unsigned char Session,
			  unsigned char Selaction,
			  unsigned char MaskMem,
			  unsigned char *MaskAdr,
			  unsigned char MaskLen,
			  unsigned char *MaskData,
			  unsigned char Truncate,int FrmHandle);
	UHFEx10_API int SetCustomRegion(unsigned char *address,unsigned char FLAG,unsigned char freSpace,unsigned char freNum,unsigned char *freStart,int FrmHandle);
	UHFEx10_API int GetCustomRegion(unsigned char *address,unsigned char *freSpace,unsigned char *freNum,unsigned char *freStart,int FrmHandle);
	UHFEx10_API int SetCalibrationPowerType(unsigned char *address,unsigned char powerType,int FrmHandle);
	UHFEx10_API int GetModuleDescribe(unsigned char *address,unsigned char *describeInfor,int FrmHandle);
	UHFEx10_API int SetRegionType(unsigned char *address,unsigned char regionType,int FrmHandle);

	UHFEx10_API int Find_epc_list_cfg(unsigned char *address,unsigned char opt,unsigned char CardNum,unsigned char *epc,int epclen,int FrmHandle);
	UHFEx10_API int Find_epc_by_list(unsigned char *address,unsigned char Fixed_Q,int Antenna,int *CardNum,unsigned char *epc,int *epclen,int FrmHandle);
	UHFEx10_API int SetTempSelect(unsigned char *address,unsigned char TempSelect,int FrmHandle);
	UHFEx10_API int MutipleAntennaSwitch(unsigned char *address,unsigned char TargetAddr,unsigned char antenna,int FrmHandle);
	UHFEx10_API int GetModuleDetails(unsigned char *address,unsigned char *Version,unsigned char *mType,unsigned char *Tr_Type,int FrmHandle);
	UHFEx10_API int SetTriggerLinkageParam(unsigned char *address,unsigned char Action,unsigned char mode,unsigned char mtime,unsigned char RFU,
		unsigned char Union,unsigned char Condition1,unsigned char Condition2,int FrmHandle);
	UHFEx10_API int GetTriggerLinkageParam(unsigned char *address,unsigned char Action,unsigned char *mode,unsigned char *mtime,unsigned char *RFU,
		unsigned char *Union,unsigned char *Condition1,unsigned char *Condition2,int FrmHandle);
	UHFEx10_API int SelectCMDByMutipleAntenna(unsigned char *address,
			  unsigned char* Antenna,
			  unsigned char Session,
			  unsigned char Selaction,
			  unsigned char MaskMem,
			  unsigned char *MaskAdr,
			  unsigned char MaskLen,
			  unsigned char *MaskData,
			  unsigned char Truncate,int FrmHandle);

	UHFEx10_API int SetMacAddr(unsigned char *address,unsigned char* mac,int FrmHandle);
	UHFEx10_API int GetMacAddr(unsigned char *address,unsigned char* mac,int FrmHandle);
	UHFEx10_API int ResetReader(unsigned char *address,int FrmHandle);

	UHFEx10_API int Protected_mode_G2(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char enableflag,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int Authenticate_G2(unsigned char *address,
		unsigned char *EPC,
		unsigned char ENum,
		unsigned char sendRep,
		unsigned char increpLen,
		unsigned char CSI,
		unsigned char MsgLen,
		unsigned char *MsgData,
		unsigned char *Password,
		unsigned char MaskMem,
		unsigned char *MaskAdr,
		unsigned char MaskLen,
		unsigned char *MaskData,
		unsigned char *auth_rep_len,
		unsigned char *auth_rep_data,
		int *Errorcode,int FrmHandle);

	UHFEx10_API int ExtGetRegion(unsigned char *address,
		unsigned char *Band,
		unsigned char *dmaxfre,
		unsigned char *dminfre,int FrmHandle);

	UHFEx10_API int ExtSetRegion(unsigned char *address,
		unsigned char FLAG,
		unsigned char Band,
		unsigned char dmaxfre,
		unsigned char dminfre,int FrmHandle);

	UHFEx10_API int SetGPOParam(unsigned char *address,
		unsigned char Enableflag,
		unsigned char ActiveTime,int FrmHandle);

	UHFEx10_API int GetGPOParam(unsigned char *address,
		unsigned char* Enableflag,
		unsigned char* ActiveTime,int FrmHandle);


	UHFEx10_API int SearchWIFI(unsigned char *address,unsigned char *APInfo,int* length,int* Count,int FrmHandle);

	UHFEx10_API int SetRJ45MacAddr(unsigned char *address,unsigned char *mac,int FrmHandle);
	UHFEx10_API int GetRJ45MacAddr(unsigned char *address,unsigned char *mac,int FrmHandle);
	UHFEx10_API int GetWIFIMacAddr(unsigned char *address,unsigned char *mac,int FrmHandle);
	UHFEx10_API int GetBluetoothMacAddr(unsigned char *address,unsigned char *mac,int FrmHandle);
	UHFEx10_API int GetBleMacAddr(unsigned char *address,unsigned char *mac,int FrmHandle);
	UHFEx10_API int RelaysControll(unsigned char *address,unsigned char num,unsigned char status,unsigned char ntime,int FrmHandle);

	UHFEx10_API int ReadRJ45ConnectStatus(unsigned char *address,unsigned char *rj45state,unsigned char *localIP,unsigned char *subnet,unsigned char *gatewayIp,int FrmHandle);
	UHFEx10_API int ReadWIFIConnectStatus(unsigned char *address,unsigned char *WIFIstate,unsigned char *localIP,unsigned char *subnet,unsigned char *gatewayIp,int FrmHandle);

	UHFEx10_API int ChangeToUpdateMode(unsigned char *ComAdr,int FrmHandle);
	UHFEx10_API int WriteBinData(unsigned char *ComAdr,unsigned char Index,unsigned char len,unsigned char *data,int FrmHandle);
	UHFEx10_API int CheckCRC32(unsigned char *ComAdr,unsigned char* crc32,int FrmHandle);
	UHFEx10_API int WriteMark(unsigned char *ComAdr,int FrmHandle);
	UHFEx10_API int SetWieGandParam(unsigned char *ComAdr,unsigned char WgCfg,unsigned char DataInvl,unsigned char PulWidth,unsigned char PulsInvl,unsigned char OffsetAdr,int FrmHandle);
	UHFEx10_API int GetWieGandParam(unsigned char *ComAdr,unsigned char *WgCfg,unsigned char *DataInvl,unsigned char *PulWidth,unsigned char *PulsInvl,unsigned char *OffsetAdr,int FrmHandle);
	UHFEx10_API int SetFilterParam(unsigned char *ComAdr,unsigned char FilterTime,unsigned char MinReadCount,unsigned char MinRssi,int FrmHandle);
	UHFEx10_API int GetFilterParam(unsigned char *ComAdr,unsigned char *FilterTime,unsigned char *MinReadCount,unsigned char *MinRssi,int FrmHandle);

	UHFEx10_API int SetCustomFilterParam(unsigned char *ComAdr,unsigned char FliterEn,unsigned char* UserMask,int FrmHandle);
	UHFEx10_API int GetCustomFilterParam(unsigned char *ComAdr,unsigned char* FliterEn,unsigned char* UserMask,int FrmHandle);

	UHFEx10_API int SetCustomTimeParam(unsigned char *ComAdr,unsigned char FliterTime,unsigned char ReadUserMemLen,int FrmHandle);
	UHFEx10_API int GetCustomTimeParam(unsigned char *ComAdr,unsigned char *FliterTime,unsigned char *ReadUserMemLen,int FrmHandle);

#ifdef __cplusplus
}
#endif
