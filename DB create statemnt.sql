CREATE TABLE `user` (
  `UserID` int NOT NULL AUTO_INCREMENT,
  `Username` varchar(50) NOT NULL,
  `Email` varchar(100) NOT NULL,
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `Username` (`Username`),
  UNIQUE KEY `Email` (`Email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `reminder` (
  `ReminderID` int NOT NULL AUTO_INCREMENT,
  `EventID` int NOT NULL,
  `UserID` int NOT NULL,
  `ReminderTime` datetime NOT NULL,
  `MinutesBeforeEvent` int NOT NULL,
  `IsSent` tinyint(1) NOT NULL DEFAULT '0',
  `CreatedAt` datetime NOT NULL,
  `SentAt` datetime DEFAULT NULL,
  `ReminderType` varchar(50) DEFAULT 'EVENT_START',
  `Message` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`ReminderID`),
  KEY `EventID` (`EventID`),
  KEY `UserID` (`UserID`),
  KEY `idx_reminder_time` (`ReminderTime`),
  KEY `idx_is_sent` (`IsSent`),
  CONSTRAINT `reminder_ibfk_1` FOREIGN KEY (`EventID`) REFERENCES `event` (`EventID`) ON DELETE CASCADE,
  CONSTRAINT `reminder_ibfk_2` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `event_shared_users` (
  `event_id` int NOT NULL,
  `userPermissions_KEY` int NOT NULL,
  `permission` varchar(20) NOT NULL DEFAULT 'VIEW',
  PRIMARY KEY (`event_id`,`userPermissions_KEY`),
  KEY `user_id` (`userPermissions_KEY`),
  KEY `idx_event_shared_users_permission` (`permission`),
  CONSTRAINT `event_shared_users_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `event` (`EventID`) ON DELETE CASCADE,
  CONSTRAINT `event_shared_users_ibfk_2` FOREIGN KEY (`userPermissions_KEY`) REFERENCES `user` (`UserID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `event` (
  `EventID` int NOT NULL AUTO_INCREMENT,
  `Title` varchar(255) NOT NULL,
  `Description` text,
  `Location` varchar(255) DEFAULT NULL,
  `StartTime` datetime NOT NULL,
  `EndTime` datetime NOT NULL,
  `IsAllDay` tinyint(1) DEFAULT '0',
  `RecurrenceType` varchar(20) DEFAULT NULL,
  `RecurrenceEnd` datetime DEFAULT NULL,
  `UserID` int DEFAULT NULL,
  `Priority` varchar(10) DEFAULT 'MEDIUM',
  `Color` varchar(20) DEFAULT NULL,
  `IsShared` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`EventID`),
  KEY `UserID` (`UserID`),
  CONSTRAINT `event_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `user` (`UserID`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
