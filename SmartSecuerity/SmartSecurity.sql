USE [master]
GO
/****** Object:  Database [SmartSecurity]    Script Date: 26/6/2568 2:40:59 PM ******/
CREATE DATABASE [SmartSecurity]
 CONTAINMENT = NONE
 ON  PRIMARY 
( NAME = N'SmartSecurity', FILENAME = N'C:\MSSQL\DB\SmartSecurity.mdf' , SIZE = 288768KB , MAXSIZE = UNLIMITED, FILEGROWTH = 1024KB )
 LOG ON 
( NAME = N'SmartSecurity_log', FILENAME = N'C:\MSSQL\DB\SmartSecurity_log.ldf' , SIZE = 5696KB , MAXSIZE = 2048GB , FILEGROWTH = 10%)
 WITH CATALOG_COLLATION = DATABASE_DEFAULT
GO
ALTER DATABASE [SmartSecurity] SET COMPATIBILITY_LEVEL = 120
GO
IF (1 = FULLTEXTSERVICEPROPERTY('IsFullTextInstalled'))
begin
EXEC [SmartSecurity].[dbo].[sp_fulltext_database] @action = 'enable'
end
GO
ALTER DATABASE [SmartSecurity] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [SmartSecurity] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [SmartSecurity] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [SmartSecurity] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [SmartSecurity] SET ARITHABORT OFF 
GO
ALTER DATABASE [SmartSecurity] SET AUTO_CLOSE OFF 
GO
ALTER DATABASE [SmartSecurity] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [SmartSecurity] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [SmartSecurity] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [SmartSecurity] SET CURSOR_DEFAULT  GLOBAL 
GO
ALTER DATABASE [SmartSecurity] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [SmartSecurity] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [SmartSecurity] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [SmartSecurity] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [SmartSecurity] SET  DISABLE_BROKER 
GO
ALTER DATABASE [SmartSecurity] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [SmartSecurity] SET DATE_CORRELATION_OPTIMIZATION OFF 
GO
ALTER DATABASE [SmartSecurity] SET TRUSTWORTHY OFF 
GO
ALTER DATABASE [SmartSecurity] SET ALLOW_SNAPSHOT_ISOLATION OFF 
GO
ALTER DATABASE [SmartSecurity] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [SmartSecurity] SET READ_COMMITTED_SNAPSHOT OFF 
GO
ALTER DATABASE [SmartSecurity] SET HONOR_BROKER_PRIORITY OFF 
GO
ALTER DATABASE [SmartSecurity] SET RECOVERY SIMPLE 
GO
ALTER DATABASE [SmartSecurity] SET  MULTI_USER 
GO
ALTER DATABASE [SmartSecurity] SET PAGE_VERIFY CHECKSUM  
GO
ALTER DATABASE [SmartSecurity] SET DB_CHAINING OFF 
GO
ALTER DATABASE [SmartSecurity] SET FILESTREAM( NON_TRANSACTED_ACCESS = OFF ) 
GO
ALTER DATABASE [SmartSecurity] SET TARGET_RECOVERY_TIME = 0 SECONDS 
GO
ALTER DATABASE [SmartSecurity] SET DELAYED_DURABILITY = DISABLED 
GO
ALTER DATABASE [SmartSecurity] SET ACCELERATED_DATABASE_RECOVERY = OFF  
GO
ALTER DATABASE [SmartSecurity] SET QUERY_STORE = OFF
GO
USE [SmartSecurity]
GO
/****** Object:  User [sptuser]    Script Date: 26/6/2568 2:40:59 PM ******/
CREATE USER [sptuser] FOR LOGIN [sptuser] WITH DEFAULT_SCHEMA=[dbo]
GO
ALTER ROLE [db_datareader] ADD MEMBER [sptuser]
GO
/****** Object:  Table [dbo].[InternalDepartment]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InternalDepartment](
	[ID_ID] [int] IDENTITY(1,1) NOT NULL,
	[ID_Code] [nvarchar](50) NOT NULL,
	[ID_LocalName] [nvarchar](300) NOT NULL,
	[ID_EnglishName] [nvarchar](300) NULL,
	[ID_IsActive] [bit] NOT NULL,
	[ID_Remarks] [nvarchar](max) NULL,
 CONSTRAINT [PK_InternalDepartment] PRIMARY KEY CLUSTERED 
(
	[ID_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InternalCompanyDepartment]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InternalCompanyDepartment](
	[ICD_ID] [int] IDENTITY(1,1) NOT NULL,
	[IC_ID] [int] NOT NULL,
	[ID_ID] [int] NOT NULL,
	[ICD_IsActive] [bit] NOT NULL,
 CONSTRAINT [PK_InternalCustomerInternalDepartment] PRIMARY KEY CLUSTERED 
(
	[ICD_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InternalCompany]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InternalCompany](
	[IC_ID] [int] IDENTITY(1,1) NOT NULL,
	[IC_Code] [nvarchar](10) NULL,
	[IC_LocalName] [nvarchar](300) NULL,
	[IC_EnglishName] [nvarchar](300) NULL,
	[IC_IsActive] [bit] NULL,
	[IC_Remarks] [nvarchar](max) NULL,
 CONSTRAINT [PK_InternalCompany] PRIMARY KEY CLUSTERED 
(
	[IC_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  View [dbo].[v_InternalCompanyInternalDepartment]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE VIEW [dbo].[v_InternalCompanyInternalDepartment]
AS
SELECT icid.ICD_ID, icid.ICD_IsActive,ic.IC_ID, ic.IC_Code, ic.IC_LocalName, ic.IC_EnglishName, ic.IC_IsActive, id.ID_ID, id.ID_Code, id.ID_LocalName, id.ID_EnglishName, id.ID_IsActive
FROM     dbo.InternalCompanyDepartment AS icid INNER JOIN
                  dbo.InternalCompany AS ic ON icid.IC_ID = ic.IC_ID INNER JOIN
                  dbo.InternalDepartment AS id ON icid.ID_ID = id.ID_ID
WHERE  (icid.ICD_IsActive = 1) AND (ic.IC_IsActive = 1) AND (id.ID_IsActive = 1)


GO
/****** Object:  Table [dbo].[SystemUser]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SystemUser](
	[SU_ID] [int] IDENTITY(1,1) NOT NULL,
	[SU_Code] [nvarchar](80) NOT NULL,
	[SU_Name1] [nvarchar](100) NOT NULL,
	[SU_Name2] [nvarchar](50) NULL,
	[SU_Email] [nvarchar](50) NULL,
	[SU_Username] [nvarchar](50) NOT NULL,
	[SU_Password] [nvarchar](50) NOT NULL,
	[SU_Remarks] [nvarchar](max) NULL,
	[SU_Active] [bit] NOT NULL,
	[SU_LogOn] [datetime] NULL,
	[SU_PinCode] [nvarchar](50) NULL,
 CONSTRAINT [PK_SystemUser] PRIMARY KEY CLUSTERED 
(
	[SU_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[WayIn]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[WayIn](
	[WI_ID] [int] IDENTITY(1,1) NOT NULL,
	[WI_Barcode] [nvarchar](50) NOT NULL,
	[WI_CardID] [nvarchar](20) NULL,
	[WI_FullName] [nvarchar](200) NOT NULL,
	[WI_Gender] [nvarchar](10) NULL,
	[WI_Address] [nvarchar](max) NULL,
	[WI_LicensePlate] [nvarchar](100) NULL,
	[WI_LicenseProvince] [nvarchar](100) NULL,
	[WI_VehicleType] [nvarchar](100) NOT NULL,
	[WI_InternalDivision] [nvarchar](100) NULL,
	[WI_Follower] [int] NOT NULL,
	[WI_Remarks] [nvarchar](max) NULL,
	[SU_ID] [int] NOT NULL,
	[WI_RecordedOn] [datetime] NOT NULL,
	[IC_ID] [int] NULL,
	[ID_ID] [int] NULL,
	[VT_ID] [int] NULL,
	[WI_FromCompany] [nvarchar](max) NULL,
	[WI_Images] [varchar](max) NULL,
	[WI_ContactName] [nvarchar](255) NULL,
	[SU_IDInternal] [int] NULL,
	[SU_IDInternalRecordedOn] [datetime] NULL,
	[SU_IDInternal_Remark] [nvarchar](max) NULL,
	[QDevice] [nvarchar](50) NULL,
 CONSTRAINT [PK_WayIn] PRIMARY KEY CLUSTERED 
(
	[WI_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[InternalCompanyVisitorType]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InternalCompanyVisitorType](
	[ICVT_ID] [int] IDENTITY(1,1) NOT NULL,
	[IC_ID] [int] NOT NULL,
	[ID_ID] [int] NOT NULL,
	[VT_ID] [int] NOT NULL,
	[ICVT_IsActive] [bit] NOT NULL,
 CONSTRAINT [PK_VisitorTypeInternalCompany] PRIMARY KEY CLUSTERED 
(
	[ICVT_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[VisitType]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[VisitType](
	[VT_ID] [int] IDENTITY(1,1) NOT NULL,
	[VT_LocalName] [nvarchar](300) NOT NULL,
	[VT_EnglishName] [nvarchar](300) NULL,
	[VT_IsActive] [bit] NOT NULL,
	[VT_Remarks] [nvarchar](max) NULL,
 CONSTRAINT [PK_VisitorType] PRIMARY KEY CLUSTERED 
(
	[VT_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  View [dbo].[v_InternalCompanyVisitorType]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE VIEW [dbo].[v_InternalCompanyVisitorType]
AS
SELECT 
icvt.ICVT_ID,icvt.ICVT_IsActive,ic.IC_ID,ic.IC_Code,ic.IC_LocalName,ic.IC_IsActive,id.ID_ID,id.ID_Code,id.ID_LocalName,id.ID_IsActive,vt.VT_ID,vt.VT_LocalName,vt.VT_IsActive
FROM InternalCompanyVisitorType icvt INNER JOIN
InternalCompany ic ON icvt.IC_ID = ic.IC_ID INNER JOIN
InternalDepartment id ON icvt.ID_ID = id.ID_ID INNER JOIN
VisitType vt ON icvt.VT_ID = vt.VT_ID
WHERE  icvt.ICVT_IsActive = 1 AND ic.IC_IsActive = 1 AND vt.VT_IsActive = 1 AND id.ID_IsActive = 1

GO
/****** Object:  View [dbo].[WayInDetail]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO




CREATE VIEW [dbo].[WayInDetail]
AS
SELECT wi.WI_ID, wi.WI_Barcode, wi.WI_RecordedOn, icvt.IC_ID, icvt.IC_Code, icvt.IC_LocalName, icvt.ID_ID, icvt.ID_Code, icvt.ID_LocalName, icvt.VT_ID, icvt.VT_LocalName,wi.WI_FromCompany, wi.WI_CardID, wi.WI_FullName, wi.WI_Gender, wi.WI_Address, 
                  wi.WI_LicensePlate, wi.WI_LicenseProvince, wi.WI_VehicleType, wi.WI_Follower, su.SU_ID, su.SU_Code, su.SU_Name1
FROM     dbo.WayIn AS wi 
INNER JOIN dbo.SystemUser AS su ON wi.SU_ID = su.SU_ID 
LEFT JOIN dbo.v_InternalCompanyVisitorType AS icvt ON wi.IC_ID = icvt.IC_ID AND wi.ID_ID = icvt.ID_ID AND wi.VT_ID = icvt.VT_ID


GO
/****** Object:  Table [dbo].[SystemRole]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SystemRole](
	[SR_ID] [int] IDENTITY(1,1) NOT NULL,
	[SR_Code] [nvarchar](50) NOT NULL,
	[SR_Name] [nvarchar](50) NOT NULL,
	[SR_Description] [nvarchar](500) NULL,
	[SR_Remarks] [nvarchar](max) NULL,
	[SR_Active] [bit] NOT NULL,
 CONSTRAINT [PK_SystemRole] PRIMARY KEY CLUSTERED 
(
	[SR_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SystemUserSystemRole]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SystemUserSystemRole](
	[SUSR_ID] [int] IDENTITY(1,1) NOT NULL,
	[SU_ID] [int] NULL,
	[SR_ID] [int] NULL,
 CONSTRAINT [PK_SystemUserSystemRole] PRIMARY KEY CLUSTERED 
(
	[SUSR_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SystemJobRole]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SystemJobRole](
	[SJR_ID] [int] IDENTITY(1,1) NOT NULL,
	[SJR_Code] [nvarchar](500) NOT NULL,
	[SJR_EnglishName] [nvarchar](500) NOT NULL,
	[SJR_LocalName] [nvarchar](500) NOT NULL,
	[SJR_IsActive] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[SJR_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SystemUserSystemJobRole]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SystemUserSystemJobRole](
	[SUSJR_ID] [int] IDENTITY(1,1) NOT NULL,
	[SU_ID] [int] NOT NULL,
	[SJR_ID] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[SUSJR_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[v_systemusersystemrole]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE VIEW [dbo].[v_systemusersystemrole]
AS
SELECT
	SU.SU_ID, SU.SU_Code, SU.SU_Name1, SU.SU_Name2, SU.SU_Email, SU.SU_Username, SU.SU_Password, SU.SU_Remarks, SU.SU_Active,
	V_CombinedSR_Name =RTRIM(LTRIM(stuff((
		SELECT ', ' + SR.SR_Name FROM ((systemuser SU1 LEFT JOIN systemusersystemrole SUSR ON ((SU.SU_ID = SUSR.SU_ID))) LEFT JOIN systemrole SR ON ((SUSR.SR_ID = SR.SR_ID)))
		WHERE SU.SU_ID = SU1.SU_ID ORDER BY SR.SR_ID FOR XML PATH(''), TYPE ).value('.', 'varchar(max)'), 1, 1, ''))),
	V_CombinedSR_Code = RTRIM(LTRIM(stuff((
		SELECT ', ' + SR.SR_Code FROM ((systemuser SU1 LEFT JOIN systemusersystemrole SUSR ON ((SU.SU_ID = SUSR.SU_ID))) LEFT JOIN systemrole SR ON ((SUSR.SR_ID = SR.SR_ID)))
		WHERE SU.SU_ID = SU1.SU_ID ORDER BY SR.SR_ID FOR XML PATH(''), TYPE ).value('.', 'varchar(max)'), 1, 1, ''))),
	V_CombinedSR_ID = RTRIM(LTRIM(stuff((
		SELECT ', ' + CAST(SR.SR_ID AS NVARCHAR(max)) FROM ((systemuser SU1 LEFT JOIN systemusersystemrole SUSR ON ((SU.SU_ID = SUSR.SU_ID))) LEFT JOIN systemrole SR ON ((SUSR.SR_ID = SR.SR_ID)))
		WHERE SU.SU_ID = SU1.SU_ID ORDER BY SR.SR_ID FOR XML PATH(''), TYPE ).value('.', 'varchar(max)'), 1, 1, ''))),
	V_CombinedSJR_EnglishName =RTRIM(LTRIM(stuff((
		SELECT ', ' + SJR.SJR_EnglishName FROM ((systemuser SU1 LEFT JOIN systemusersystemjobrole SUSJR ON ((SU.SU_ID = SUSJR.SU_ID))) LEFT JOIN systemjobrole SJR ON ((SUSJR.SJR_ID = SJR.SJR_ID)))
		WHERE SU.SU_ID = SU1.SU_ID ORDER BY SJR.SJR_ID FOR XML PATH(''), TYPE ).value('.', 'varchar(max)'), 1, 1, ''))),
	V_CombinedSJR_LocalName =RTRIM(LTRIM(stuff((
		SELECT ', ' + SJR.SJR_LocalName FROM ((systemuser SU1 LEFT JOIN systemusersystemjobrole SUSJR ON ((SU.SU_ID = SUSJR.SU_ID))) LEFT JOIN systemjobrole SJR ON ((SUSJR.SJR_ID = SJR.SJR_ID)))
		WHERE SU.SU_ID = SU1.SU_ID ORDER BY SJR.SJR_ID FOR XML PATH(''), TYPE ).value('.', 'varchar(max)'), 1, 1, ''))),
	V_CombinedSJR_Code = RTRIM(LTRIM(stuff((
		SELECT ', ' + SJR.SJR_Code FROM ((systemuser SU1 LEFT JOIN systemusersystemjobrole SUSJR ON ((SU.SU_ID = SUSJR.SU_ID))) LEFT JOIN systemjobrole SJR ON ((SUSJR.SJR_ID = SJR.SJR_ID)))
		WHERE SU.SU_ID = SU1.SU_ID ORDER BY SJR.SJR_ID FOR XML PATH(''), TYPE ).value('.', 'varchar(max)'), 1, 1, ''))),
	V_CombinedSJR_ID = RTRIM(LTRIM(stuff((
		SELECT ', ' + CAST(SJR.SJR_ID AS NVARCHAR(max)) FROM ((systemuser SU1 LEFT JOIN systemusersystemjobrole SUSJR ON ((SU.SU_ID = SUSJR.SU_ID))) LEFT JOIN systemjobrole SJR ON ((SUSJR.SJR_ID = SJR.SJR_ID)))
		WHERE SU.SU_ID = SU1.SU_ID ORDER BY SJR.SJR_ID FOR XML PATH(''), TYPE ).value('.', 'varchar(max)'), 1, 1, '')))
FROM systemuser SU
GROUP BY SU.SU_ID, SU.SU_Code, SU.SU_Name1, SU.SU_Name2, SU.SU_Email, SU.SU_Username, SU.SU_Password, SU.SU_Remarks, SU.SU_Active
GO
/****** Object:  Table [dbo].[WayOut]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[WayOut](
	[WO_ID] [int] IDENTITY(1,1) NOT NULL,
	[WI_ID] [int] NOT NULL,
	[SU_ID] [int] NOT NULL,
	[WO_RecordedOn] [datetime] NOT NULL,
	[WO_Remarks] [nvarchar](max) NULL,
 CONSTRAINT [PK_WayOut] PRIMARY KEY CLUSTERED 
(
	[WO_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  View [dbo].[WayOutDetail]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[WayOutDetail]
AS
SELECT 
	wi.WI_ID,wi.WI_Barcode,wi.WI_FullName,wi.WI_LicensePlate,wi.WI_LicenseProvince,wi.WI_Follower,wi.WI_RecordedOn,wi.WI_Remarks,
	wo.WO_ID,wo.WO_RecordedOn,wo.WO_Remarks
FROM WayIn wi INNER JOIN WayOut wo ON wi.WI_ID = wo.WI_ID
GO
/****** Object:  Table [dbo].[SystemRoleSystemScreen]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SystemRoleSystemScreen](
	[SRSS_ID] [int] IDENTITY(1,1) NOT NULL,
	[SR_ID] [int] NOT NULL,
	[SS_ID] [int] NOT NULL,
	[SRSS_HiddenFieldIds] [nvarchar](max) NOT NULL,
	[SRSS_ReadOnlyFieldIds] [nvarchar](max) NOT NULL,
	[SRSS_Remarks] [nvarchar](max) NULL,
	[SRSS_HiddenColumnNames] [nvarchar](max) NULL,
	[SRSS_NoValidateFieldIds] [nvarchar](max) NULL,
 CONSTRAINT [PK_SystemRoleSystemScreen] PRIMARY KEY CLUSTERED 
(
	[SRSS_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SystemScreen]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SystemScreen](
	[SS_ID] [int] IDENTITY(1,1) NOT NULL,
	[SS_RelativePath] [nvarchar](200) NOT NULL,
	[SS_Description] [nvarchar](200) NULL,
	[SS_IsActive] [bit] NOT NULL,
	[SS_Remarks] [nvarchar](max) NULL,
	[SS_ShowInMenu] [bit] NOT NULL,
	[SS_ImagePath] [nvarchar](100) NULL,
	[SS_Position] [int] NULL,
	[SS_IDParent] [int] NULL,
	[SS_SortChildrenByName] [bit] NULL,
	[SS_IsExpanded] [bit] NULL,
	[SS_Name] [nvarchar](200) NULL,
 CONSTRAINT [PK_SystemScreen] PRIMARY KEY CLUSTERED 
(
	[SS_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  View [dbo].[v_systemuserrolescreen]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE VIEW [dbo].[v_systemuserrolescreen]
AS
SELECT DISTINCT
	susr.SU_ID, srss.SR_ID, ss.SS_ID, ss.SS_RelativePath, ss.SS_Description, ss.SS_IsActive, ss.SS_Remarks, ss.SS_ImagePath, ss.SS_Position, ss.SS_IDParent,
	ss.SS_ShowInMenu, ss.SS_SortChildrenByName, ss.SS_IsExpanded, ss.SS_Name, srss.SRSS_HiddenFieldIds, srss.SRSS_ReadOnlyFieldIds,
	srss.SRSS_HiddenColumnNames, dbo.SystemRole.SR_Name, dbo.SystemRole.SR_Code, srss.SRSS_NoValidateFieldIds
FROM
	dbo.SystemUserSystemRole AS susr INNER JOIN
	dbo.SystemRoleSystemScreen AS srss ON susr.SR_ID = srss.SR_ID INNER JOIN
	dbo.SystemScreen AS ss ON ss.SS_ID = srss.SS_ID INNER JOIN
	dbo.SystemRole ON srss.SR_ID = dbo.SystemRole.SR_ID
GO
/****** Object:  Table [dbo].[InformationDisplay]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[InformationDisplay](
	[IFMTD_ID] [int] IDENTITY(1,1) NOT NULL,
	[SR_ID] [int] NOT NULL,
	[SS_ID] [int] NOT NULL,
 CONSTRAINT [PK_InformationDisplay] PRIMARY KEY CLUSTERED 
(
	[IFMTD_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[v_informationDisplay]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO



CREATE VIEW [dbo].[v_informationDisplay]
AS
SELECT
	ifmtd.IFMTD_ID,sr.*,ss.*
FROM InformationDisplay ifmtd
INNER JOIN SystemRole sr ON ifmtd.SR_ID = sr.SR_ID
INNER JOIN SystemScreen ss ON ifmtd.SS_ID = ss.SS_ID
GO
/****** Object:  Table [dbo].[ChangeHistory]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ChangeHistory](
	[CH_ID] [int] IDENTITY(1,1) NOT NULL,
	[CH_RecordedOn] [datetime] NOT NULL,
	[CH_Operation] [nvarchar](50) NOT NULL,
	[CH_MasterTableName] [nvarchar](100) NULL,
	[CH_MasterPrimaryKeyId] [int] NULL,
	[CH_TableName] [nvarchar](100) NULL,
	[CH_PrimaryKeyId] [int] NULL,
	[CH_Changes] [nvarchar](max) NOT NULL,
	[CH_ChangedBy] [nvarchar](100) NULL,
	[CH_SourcePath] [nvarchar](max) NULL,
 CONSTRAINT [PK_ChangeHistory] PRIMARY KEY CLUSTERED 
(
	[CH_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ConnectionHistory]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ConnectionHistory](
	[CH_ID] [int] IDENTITY(1,1) NOT NULL,
	[SU_ID] [int] NOT NULL,
	[CH_RecordedOn] [datetime] NOT NULL,
	[CH_IPAddress] [nvarchar](15) NULL,
	[CH_EventType] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK_ConnectionHistory] PRIMARY KEY CLUSTERED 
(
	[CH_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ExternalCar]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ExternalCar](
	[EP_ID] [nchar](10) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ExternalCompany]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ExternalCompany](
	[EC_ID] [int] IDENTITY(1,1) NOT NULL,
	[EC_Code] [nvarchar](10) NOT NULL,
	[EC_LocalName] [nvarchar](300) NOT NULL,
	[EC_EnglishName] [nvarchar](300) NULL,
	[EC_IsActive] [bit] NOT NULL,
	[EC_Remarks] [nvarchar](max) NULL,
 CONSTRAINT [PK_ExternalCompany] PRIMARY KEY CLUSTERED 
(
	[EC_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ExternalCompanyCar]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ExternalCompanyCar](
	[ECC_ID] [nchar](10) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ServiceVersion]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ServiceVersion](
	[SV_ID] [int] IDENTITY(1,1) NOT NULL,
	[SV_Version] [nvarchar](13) NOT NULL,
	[SV_Description] [nvarchar](max) NULL,
	[SU_IDRecordBy] [int] NOT NULL,
	[SV_RecordedOn] [datetime] NOT NULL,
	[SV_IsLatest] [bit] NOT NULL,
 CONSTRAINT [PK_ServiceVersion] PRIMARY KEY CLUSTERED 
(
	[SV_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SystemOpenedScreenLogged]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SystemOpenedScreenLogged](
	[SOSL_ID] [int] IDENTITY(1,1) NOT NULL,
	[SU_ID] [int] NULL,
	[SS_ID] [int] NULL,
	[SOSL_DateTimeOpened] [datetime] NULL,
	[SOSL_ScreenPKId] [int] NULL,
 CONSTRAINT [PK_SystemOpenedPagesLog_1] PRIMARY KEY CLUSTERED 
(
	[SOSL_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SystemUserBranch]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SystemUserBranch](
	[SUB_ID] [int] IDENTITY(1,1) NOT NULL,
	[SU_ID] [int] NOT NULL,
	[B_ID] [int] NULL,
 CONSTRAINT [PK_SystemUserBranch] PRIMARY KEY CLUSTERED 
(
	[SUB_ID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [NIDX1_WayIn]    Script Date: 26/6/2568 2:40:59 PM ******/
CREATE NONCLUSTERED INDEX [NIDX1_WayIn] ON [dbo].[WayIn]
(
	[WI_Barcode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [NIDX2_WayIn_Include_WI_RecordedOn]    Script Date: 26/6/2568 2:40:59 PM ******/
CREATE NONCLUSTERED INDEX [NIDX2_WayIn_Include_WI_RecordedOn] ON [dbo].[WayIn]
(
	[WI_RecordedOn] ASC
)
INCLUDE([WI_Barcode],[SU_ID],[IC_ID],[ID_ID],[VT_ID]) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [NIDX3_WayOut_Include_WI_ID]    Script Date: 26/6/2568 2:40:59 PM ******/
CREATE NONCLUSTERED INDEX [NIDX3_WayOut_Include_WI_ID] ON [dbo].[WayOut]
(
	[WI_ID] ASC
)
INCLUDE([WO_RecordedOn]) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[ExternalCompany] ADD  CONSTRAINT [DF_ExternalCompany_EC_IsActive]  DEFAULT ((0)) FOR [EC_IsActive]
GO
ALTER TABLE [dbo].[InternalCompanyDepartment] ADD  CONSTRAINT [DF_InternalCustomerInternalDepartment_ICID_IsActive]  DEFAULT ((0)) FOR [ICD_IsActive]
GO
ALTER TABLE [dbo].[InternalCompanyVisitorType] ADD  CONSTRAINT [DF_VisitorTypeInternalCompany_ICVT_IsActive]  DEFAULT ((0)) FOR [ICVT_IsActive]
GO
ALTER TABLE [dbo].[InternalDepartment] ADD  CONSTRAINT [DF_InternalDepartment_ID_IsActive]  DEFAULT ((0)) FOR [ID_IsActive]
GO
ALTER TABLE [dbo].[ServiceVersion] ADD  CONSTRAINT [DF_ServiceVersion_SV_IsLatest_1]  DEFAULT ((0)) FOR [SV_IsLatest]
GO
ALTER TABLE [dbo].[SystemRole] ADD  CONSTRAINT [DF_SystemRole_SR_Active]  DEFAULT ((1)) FOR [SR_Active]
GO
ALTER TABLE [dbo].[SystemUser] ADD  CONSTRAINT [DF_SystemUser_SU_Active]  DEFAULT ((1)) FOR [SU_Active]
GO
ALTER TABLE [dbo].[VisitType] ADD  CONSTRAINT [DF_VisitorType_VT_IsActive]  DEFAULT ((0)) FOR [VT_IsActive]
GO
ALTER TABLE [dbo].[SystemOpenedScreenLogged]  WITH NOCHECK ADD  CONSTRAINT [FK_SystemOpenedPagesLog_SystemUser] FOREIGN KEY([SU_ID])
REFERENCES [dbo].[SystemUser] ([SU_ID])
ON UPDATE CASCADE
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[SystemOpenedScreenLogged] CHECK CONSTRAINT [FK_SystemOpenedPagesLog_SystemUser]
GO
ALTER TABLE [dbo].[SystemRoleSystemScreen]  WITH NOCHECK ADD  CONSTRAINT [FK_SystemRoleSystemScreen_SystemRole] FOREIGN KEY([SR_ID])
REFERENCES [dbo].[SystemRole] ([SR_ID])
ON UPDATE CASCADE
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[SystemRoleSystemScreen] CHECK CONSTRAINT [FK_SystemRoleSystemScreen_SystemRole]
GO
ALTER TABLE [dbo].[SystemRoleSystemScreen]  WITH NOCHECK ADD  CONSTRAINT [FK_SystemRoleSystemScreen_SystemScreen] FOREIGN KEY([SS_ID])
REFERENCES [dbo].[SystemScreen] ([SS_ID])
ON UPDATE CASCADE
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[SystemRoleSystemScreen] CHECK CONSTRAINT [FK_SystemRoleSystemScreen_SystemScreen]
GO
ALTER TABLE [dbo].[SystemUserBranch]  WITH CHECK ADD  CONSTRAINT [FK_SystemUserBranch_SystemUser] FOREIGN KEY([SU_ID])
REFERENCES [dbo].[SystemUser] ([SU_ID])
ON UPDATE CASCADE
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[SystemUserBranch] CHECK CONSTRAINT [FK_SystemUserBranch_SystemUser]
GO
/****** Object:  StoredProcedure [dbo].[CheckSystemOpenedScreenLogged]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[CheckSystemOpenedScreenLogged]
	@SU_ID INT,
	@SS_RelativePath NVARCHAR(500),
	@SOSL_ScreenPKId INT,
	@SOSL_DateTimeOpened Datetime,
	@bThisScreenReadOnly bit,
	@SOSL_ID INT
AS
BEGIN
	SET NOCOUNT ON;
	DECLARE @SU_IDInDB INT = -1; 
	DECLARE @Inserted INT; 
	DECLARE @SOSL_IDOpen INT; 

	DELETE FROM SystemOpenedScreenLogged WHERE CAST(SOSL_DateTimeOpened AS date) <= CAST(DATEADD(day,-2,GETDATE()) AS date);

	IF (@bThisScreenReadOnly=1) --This Screen is ReadOnly Not record-----------------------------------
		BEGIN
			SELECT 1 AS Result,-1 AS SOSL;
		END
		ELSE
		BEGIN
			-- Select user to use this screen and this record--------------------------------------
			SELECT @SU_IDInDB = SU_ID,@SOSL_IDOpen=SOSL_ID FROM SystemOpenedScreenLogged sosl
			INNER JOIN SystemScreen ss on sosl.SS_ID = ss.SS_ID
			WHERE SOSL_ScreenPKId = @SOSL_ScreenPKId AND SS_RelativePath = @SS_RelativePath
			ORDER BY SOSL_ID
			OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY

			IF (@SU_IDInDB != -1 AND @SU_IDInDB IS NOT NULL) -- Have User Use This Screen and this record-----------------------------------
				BEGIN
				IF (@SU_ID = @SU_IDInDB)  -- That User is You--------------------------------------
				BEGIN
					INSERT INTO SystemOpenedScreenLogged (SU_ID, SOSL_DateTimeOpened,SOSL_ScreenPKId,SS_ID) 
					SELECT @SU_ID,@SOSL_DateTimeOpened,@SOSL_ScreenPKId, x.SS_ID FROM SystemScreen x WHERE x.SS_RelativePath = @SS_RelativePath; 
					SET @Inserted = SCOPE_IDENTITY();  
					SELECT 1 AS Result,@Inserted AS SOSL;
				END
			ELSE  -- That User Not You--------------------------------------
				BEGIN
					SELECT 0 AS Result,-1 AS SOSL,su.SU_Name1 AS SU_Name1, sosl.SOSL_DateTimeOpened AS SOSL_DateTimeOpened FROM SystemOpenedScreenLogged sosl
					INNER JOIN SystemScreen ss on sosl.SS_ID = ss.SS_ID
					INNER JOIN SystemUser su ON sosl.SU_ID = su.SU_ID
					WHERE SOSL_ScreenPKId = @SOSL_ScreenPKId AND SS_RelativePath = @SS_RelativePath
					ORDER BY SOSL_ID
					OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY
				END
			END
			ELSE -- Not Have User Use This Screen and this record--------------------------------------
			BEGIN
				INSERT INTO SystemOpenedScreenLogged (SU_ID, SOSL_DateTimeOpened,SOSL_ScreenPKId,SS_ID) 
				SELECT @SU_ID,@SOSL_DateTimeOpened,@SOSL_ScreenPKId,x.SS_ID FROM SystemScreen x WHERE x.SS_RelativePath = @SS_RelativePath; 
				SET @Inserted = SCOPE_IDENTITY();  
				SELECT 1 AS Result,@Inserted AS SOSL;
			END
		END
END
GO
/****** Object:  StoredProcedure [dbo].[VisitDetail]    Script Date: 26/6/2568 2:40:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
CREATE PROCEDURE [dbo].[VisitDetail]
	@Start DATE,
	@End DATE
AS
BEGIN
	SET NOCOUNT ON;

	SELECT
	wi.WI_Barcode AS Barcode, wi.WI_FullName AS FullName, wi.WI_LicensePlate AS LicensePlate, wi.WI_LicenseProvince AS Province, wi.WI_VehicleType AS VehicleType, wi.WI_Follower AS Follower,
	wi.IC_LocalName AS Company, wi.ID_LocalName AS Department, wi.VT_LocalName AS VisitType,
	wi.WI_RecordedOn AS WayInDateTime, wo.WO_RecordedOn AS WayOutDateTime,
	CASE WHEN wo.WO_RecordedOn IS NULL THEN '00:00' ELSE CONCAT(FORMAT(DATEDIFF(HOUR,wi.WI_RecordedOn,wo.WO_RecordedOn)/60,'00'),':',FORMAT(DATEDIFF(MINUTE,wi.WI_RecordedOn,wo.WO_RecordedOn)%60,'00')) END AS LiveTime
	FROM WayInDetail wi LEFT OUTER JOIN WayOut wo ON wi.WI_ID = wo.WI_ID
	WHERE wi.WI_RecordedOn >= @Start AND wi.WI_RecordedOn < @End
END
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPane1', @value=N'[0E232FF0-B466-11cf-A24F-00AA00A3EFFF, 1.00]
Begin DesignProperties = 
   Begin PaneConfigurations = 
      Begin PaneConfiguration = 0
         NumPanes = 4
         Configuration = "(H (1[40] 4[20] 2[20] 3) )"
      End
      Begin PaneConfiguration = 1
         NumPanes = 3
         Configuration = "(H (1 [50] 4 [25] 3))"
      End
      Begin PaneConfiguration = 2
         NumPanes = 3
         Configuration = "(H (1 [50] 2 [25] 3))"
      End
      Begin PaneConfiguration = 3
         NumPanes = 3
         Configuration = "(H (4 [30] 2 [40] 3))"
      End
      Begin PaneConfiguration = 4
         NumPanes = 2
         Configuration = "(H (1 [56] 3))"
      End
      Begin PaneConfiguration = 5
         NumPanes = 2
         Configuration = "(H (2 [66] 3))"
      End
      Begin PaneConfiguration = 6
         NumPanes = 2
         Configuration = "(H (4 [50] 3))"
      End
      Begin PaneConfiguration = 7
         NumPanes = 1
         Configuration = "(V (3))"
      End
      Begin PaneConfiguration = 8
         NumPanes = 3
         Configuration = "(H (1[56] 4[18] 2) )"
      End
      Begin PaneConfiguration = 9
         NumPanes = 2
         Configuration = "(H (1 [75] 4))"
      End
      Begin PaneConfiguration = 10
         NumPanes = 2
         Configuration = "(H (1[66] 2) )"
      End
      Begin PaneConfiguration = 11
         NumPanes = 2
         Configuration = "(H (4 [60] 2))"
      End
      Begin PaneConfiguration = 12
         NumPanes = 1
         Configuration = "(H (1) )"
      End
      Begin PaneConfiguration = 13
         NumPanes = 1
         Configuration = "(V (4))"
      End
      Begin PaneConfiguration = 14
         NumPanes = 1
         Configuration = "(V (2))"
      End
      ActivePaneConfig = 0
   End
   Begin DiagramPane = 
      Begin Origin = 
         Top = 0
         Left = 0
      End
      Begin Tables = 
         Begin Table = "icid"
            Begin Extent = 
               Top = 7
               Left = 48
               Bottom = 170
               Right = 242
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "ic"
            Begin Extent = 
               Top = 7
               Left = 290
               Bottom = 170
               Right = 491
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "id"
            Begin Extent = 
               Top = 7
               Left = 539
               Bottom = 170
               Right = 742
            End
            DisplayFlags = 280
            TopColumn = 0
         End
      End
   End
   Begin SQLPane = 
   End
   Begin DataPane = 
      Begin ParameterDefaults = ""
      End
   End
   Begin CriteriaPane = 
      Begin ColumnWidths = 11
         Column = 1440
         Alias = 900
         Table = 1170
         Output = 720
         Append = 1400
         NewValue = 1170
         SortType = 1350
         SortOrder = 1410
         GroupBy = 1350
         Filter = 1350
         Or = 1350
         Or = 1350
         Or = 1350
      End
   End
End
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_InternalCompanyInternalDepartment'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPaneCount', @value=1 , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_InternalCompanyInternalDepartment'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPane1', @value=N'[0E232FF0-B466-11cf-A24F-00AA00A3EFFF, 1.00]
Begin DesignProperties = 
   Begin PaneConfigurations = 
      Begin PaneConfiguration = 0
         NumPanes = 4
         Configuration = "(H (1[40] 4[20] 2[20] 3) )"
      End
      Begin PaneConfiguration = 1
         NumPanes = 3
         Configuration = "(H (1 [50] 4 [25] 3))"
      End
      Begin PaneConfiguration = 2
         NumPanes = 3
         Configuration = "(H (1 [50] 2 [25] 3))"
      End
      Begin PaneConfiguration = 3
         NumPanes = 3
         Configuration = "(H (4 [30] 2 [40] 3))"
      End
      Begin PaneConfiguration = 4
         NumPanes = 2
         Configuration = "(H (1 [56] 3))"
      End
      Begin PaneConfiguration = 5
         NumPanes = 2
         Configuration = "(H (2 [66] 3))"
      End
      Begin PaneConfiguration = 6
         NumPanes = 2
         Configuration = "(H (4 [50] 3))"
      End
      Begin PaneConfiguration = 7
         NumPanes = 1
         Configuration = "(V (3))"
      End
      Begin PaneConfiguration = 8
         NumPanes = 3
         Configuration = "(H (1[56] 4[18] 2) )"
      End
      Begin PaneConfiguration = 9
         NumPanes = 2
         Configuration = "(H (1 [75] 4))"
      End
      Begin PaneConfiguration = 10
         NumPanes = 2
         Configuration = "(H (1[66] 2) )"
      End
      Begin PaneConfiguration = 11
         NumPanes = 2
         Configuration = "(H (4 [60] 2))"
      End
      Begin PaneConfiguration = 12
         NumPanes = 1
         Configuration = "(H (1) )"
      End
      Begin PaneConfiguration = 13
         NumPanes = 1
         Configuration = "(V (4))"
      End
      Begin PaneConfiguration = 14
         NumPanes = 1
         Configuration = "(V (2))"
      End
      ActivePaneConfig = 0
   End
   Begin DiagramPane = 
      Begin Origin = 
         Top = 0
         Left = 0
      End
      Begin Tables = 
         Begin Table = "icvt"
            Begin Extent = 
               Top = 7
               Left = 48
               Bottom = 170
               Right = 242
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "ic"
            Begin Extent = 
               Top = 7
               Left = 290
               Bottom = 170
               Right = 491
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "vt"
            Begin Extent = 
               Top = 7
               Left = 539
               Bottom = 170
               Right = 744
            End
            DisplayFlags = 280
            TopColumn = 0
         End
      End
   End
   Begin SQLPane = 
   End
   Begin DataPane = 
      Begin ParameterDefaults = ""
      End
   End
   Begin CriteriaPane = 
      Begin ColumnWidths = 11
         Column = 1440
         Alias = 900
         Table = 1170
         Output = 720
         Append = 1400
         NewValue = 1170
         SortType = 1350
         SortOrder = 1410
         GroupBy = 1350
         Filter = 1350
         Or = 1350
         Or = 1350
         Or = 1350
      End
   End
End
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_InternalCompanyVisitorType'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPaneCount', @value=1 , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_InternalCompanyVisitorType'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPane1', @value=N'[0E232FF0-B466-11cf-A24F-00AA00A3EFFF, 1.00]
Begin DesignProperties = 
   Begin PaneConfigurations = 
      Begin PaneConfiguration = 0
         NumPanes = 4
         Configuration = "(H (1[40] 4[20] 2[20] 3) )"
      End
      Begin PaneConfiguration = 1
         NumPanes = 3
         Configuration = "(H (1 [50] 4 [25] 3))"
      End
      Begin PaneConfiguration = 2
         NumPanes = 3
         Configuration = "(H (1 [50] 2 [25] 3))"
      End
      Begin PaneConfiguration = 3
         NumPanes = 3
         Configuration = "(H (4 [30] 2 [40] 3))"
      End
      Begin PaneConfiguration = 4
         NumPanes = 2
         Configuration = "(H (1 [56] 3))"
      End
      Begin PaneConfiguration = 5
         NumPanes = 2
         Configuration = "(H (2 [66] 3))"
      End
      Begin PaneConfiguration = 6
         NumPanes = 2
         Configuration = "(H (4 [50] 3))"
      End
      Begin PaneConfiguration = 7
         NumPanes = 1
         Configuration = "(V (3))"
      End
      Begin PaneConfiguration = 8
         NumPanes = 3
         Configuration = "(H (1[56] 4[18] 2) )"
      End
      Begin PaneConfiguration = 9
         NumPanes = 2
         Configuration = "(H (1 [75] 4))"
      End
      Begin PaneConfiguration = 10
         NumPanes = 2
         Configuration = "(H (1[66] 2) )"
      End
      Begin PaneConfiguration = 11
         NumPanes = 2
         Configuration = "(H (4 [60] 2))"
      End
      Begin PaneConfiguration = 12
         NumPanes = 1
         Configuration = "(H (1) )"
      End
      Begin PaneConfiguration = 13
         NumPanes = 1
         Configuration = "(V (4))"
      End
      Begin PaneConfiguration = 14
         NumPanes = 1
         Configuration = "(V (2))"
      End
      ActivePaneConfig = 0
   End
   Begin DiagramPane = 
      Begin Origin = 
         Top = 0
         Left = 0
      End
      Begin Tables = 
         Begin Table = "wi"
            Begin Extent = 
               Top = 7
               Left = 48
               Bottom = 170
               Right = 271
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "su"
            Begin Extent = 
               Top = 7
               Left = 319
               Bottom = 170
               Right = 513
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "icvt"
            Begin Extent = 
               Top = 7
               Left = 561
               Bottom = 170
               Right = 755
            End
            DisplayFlags = 280
            TopColumn = 0
         End
      End
   End
   Begin SQLPane = 
   End
   Begin DataPane = 
      Begin ParameterDefaults = ""
      End
   End
   Begin CriteriaPane = 
      Begin ColumnWidths = 11
         Column = 1440
         Alias = 900
         Table = 1170
         Output = 720
         Append = 1400
         NewValue = 1170
         SortType = 1350
         SortOrder = 1410
         GroupBy = 1350
         Filter = 1350
         Or = 1350
         Or = 1350
         Or = 1350
      End
   End
End
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'WayInDetail'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPaneCount', @value=1 , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'WayInDetail'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPane1', @value=N'[0E232FF0-B466-11cf-A24F-00AA00A3EFFF, 1.00]
Begin DesignProperties = 
   Begin PaneConfigurations = 
      Begin PaneConfiguration = 0
         NumPanes = 4
         Configuration = "(H (1[40] 4[20] 2[20] 3) )"
      End
      Begin PaneConfiguration = 1
         NumPanes = 3
         Configuration = "(H (1 [50] 4 [25] 3))"
      End
      Begin PaneConfiguration = 2
         NumPanes = 3
         Configuration = "(H (1 [50] 2 [25] 3))"
      End
      Begin PaneConfiguration = 3
         NumPanes = 3
         Configuration = "(H (4 [30] 2 [40] 3))"
      End
      Begin PaneConfiguration = 4
         NumPanes = 2
         Configuration = "(H (1 [56] 3))"
      End
      Begin PaneConfiguration = 5
         NumPanes = 2
         Configuration = "(H (2 [66] 3))"
      End
      Begin PaneConfiguration = 6
         NumPanes = 2
         Configuration = "(H (4 [50] 3))"
      End
      Begin PaneConfiguration = 7
         NumPanes = 1
         Configuration = "(V (3))"
      End
      Begin PaneConfiguration = 8
         NumPanes = 3
         Configuration = "(H (1[56] 4[18] 2) )"
      End
      Begin PaneConfiguration = 9
         NumPanes = 2
         Configuration = "(H (1 [75] 4))"
      End
      Begin PaneConfiguration = 10
         NumPanes = 2
         Configuration = "(H (1[66] 2) )"
      End
      Begin PaneConfiguration = 11
         NumPanes = 2
         Configuration = "(H (4 [60] 2))"
      End
      Begin PaneConfiguration = 12
         NumPanes = 1
         Configuration = "(H (1) )"
      End
      Begin PaneConfiguration = 13
         NumPanes = 1
         Configuration = "(V (4))"
      End
      Begin PaneConfiguration = 14
         NumPanes = 1
         Configuration = "(V (2))"
      End
      ActivePaneConfig = 0
   End
   Begin DiagramPane = 
      Begin Origin = 
         Top = 0
         Left = 0
      End
      Begin Tables = 
         Begin Table = "ChangeHistory"
            Begin Extent = 
               Top = 7
               Left = 48
               Bottom = 170
               Right = 301
            End
            DisplayFlags = 280
            TopColumn = 0
         End
      End
   End
   Begin SQLPane = 
   End
   Begin DataPane = 
      Begin ParameterDefaults = ""
      End
   End
   Begin CriteriaPane = 
      Begin ColumnWidths = 11
         Column = 1440
         Alias = 900
         Table = 1170
         Output = 720
         Append = 1400
         NewValue = 1170
         SortType = 1350
         SortOrder = 1410
         GroupBy = 1350
         Filter = 1350
         Or = 1350
         Or = 1350
         Or = 1350
      End
   End
End
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'WayOutDetail'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPaneCount', @value=1 , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'WayOutDetail'
GO
USE [master]
GO
ALTER DATABASE [SmartSecurity] SET  READ_WRITE 
GO
